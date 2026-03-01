const snowflake = require('snowflake-sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ---- Snowflake Connection ----
const privateKeyPath = path.join(__dirname, '../private_key_pkcs8.pem');
const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

const connection = snowflake.createConnection({
  account: 'cnc27663.us-east-1.aws',
  username: 'typicality',
  authenticator: 'SNOWFLAKE_JWT',
  privateKey,
  warehouse: 'TEST_WH',
  database: 'WALKS',
  schema: 'PUBLIC',
  role: 'SYSADMIN',
});

// ---- Supabase Connection ----
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://zsujhugkllbnqidswkgt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY ||   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzdWpodWdrbGxibnFpZHN3a2d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDEzMDksImV4cCI6MjA4Nzg3NzMwOX0.uhVV5pfHjADE19ZrSUdvVKGi3ZgmRi9c0VRClCC8NsM';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- Execute SQL (Promise wrapper) ----
function executeSql(sql) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    });
  });
}

// ---- Main Flow ----
async function syncWalksToSnowflake() {
  try {
    // 1. Connect to Snowflake
    await new Promise((resolve, reject) => {
      connection.connect((err, conn) => {
        if (err) reject(err);
        else {
          console.log('✅ Connected to Snowflake!');
          resolve(conn);
        }
      });
    });

    // 2. Fetch walks from Supabase
    console.log('📥 Fetching walks from Supabase...');
    const { data: walks, error: fetchError } = await supabase
      .from('walks')
      .select('*');

    if (fetchError) throw fetchError;
    console.log(`✅ Fetched ${walks.length} walks from Supabase`);

    // 3. Create walks table
    console.log('📋 Creating walks table...');
    await executeSql(`
      CREATE OR REPLACE TABLE walks (
        idx INT,
        id STRING,
        name STRING,
        email STRING,
        year STRING,
        from_loc STRING,
        to_loc STRING,
        fromlat STRING,
        fromlng STRING,
        tolat STRING,
        tolng STRING,
        maxspots INT,
        joinedspots INT,
        type STRING,
        notes STRING,
        isotime TIMESTAMP_TZ,
        created_at TIMESTAMP_TZ,
        created_by STRING,
        distance_meters FLOAT
      )
    `);
    console.log('✅ Table created');

    // 4. Insert data from Supabase
    if (walks.length > 0) {
      console.log(`📝 Inserting ${walks.length} walks into Snowflake...`);
      
      for (const walk of walks) {
        const sql = `
          INSERT INTO walks (id, name, email, year, from_loc, to_loc, fromlat, fromlng, tolat, tolng, maxspots, joinedspots, type, notes, isotime, created_at, created_by, distance_meters)
          VALUES (
            '${walk.id || ''}',
            '${(walk.name || '').replace(/'/g, "''")}',
            '${(walk.email || '').replace(/'/g, "''")}',
            '${(walk.year || '').replace(/'/g, "''")}',
            '${(walk.from_loc || '').replace(/'/g, "''")}',
            '${(walk.to_loc || '').replace(/'/g, "''")}',
            '${walk.fromlat || 'NULL'}',
            '${walk.fromlng || 'NULL'}',
            '${walk.tolat || 'NULL'}',
            '${walk.tolng || 'NULL'}',
            ${walk.maxspots || 0},
            ${walk.joinedspots || 0},
            '${(walk.type || '').replace(/'/g, "''")}',
            '${(walk.notes || '').replace(/'/g, "''")}',
            '${walk.isotime || new Date().toISOString()}'::TIMESTAMP_TZ,
            '${walk.created_at || new Date().toISOString()}'::TIMESTAMP_TZ,
            '${(walk.created_by || '').replace(/'/g, "''")}',
            ${walk.distance_meters || 'NULL'}
          )
        `;
        await executeSql(sql);
      }
      console.log('✅ All walks inserted');
    }

    // 5. Show tables
    console.log('\n📊 Tables in schema:');
    const tables = await executeSql('SHOW TABLES');
    console.log(tables);

    // 6. Select all walks
    console.log('\n🚶 All walks in Snowflake:');
    const allWalks = await executeSql('SELECT * FROM WALKS');
    console.log(`Found ${allWalks.length} walks`);
    console.log(allWalks.slice(0, 3)); // Show first 3

    // 7. Create features table
    console.log('\n🔧 Creating walks_features table...');
    await executeSql(`
      CREATE OR REPLACE TABLE walks_features AS
      SELECT
        TO_VARCHAR(DATE_PART('DOW', isotime)) AS day_of_week,
        TO_VARCHAR(DATE_PART('HOUR', isotime)) AS hour_of_day,
        fromlat::FLOAT AS fromlat,
        fromlng::FLOAT AS fromlng,
        tolat::FLOAT AS tolat,
        tolng::FLOAT AS tolng,
        joinedspots
      FROM walks
    `);
    console.log('✅ Features table created');

    // 8. Create busiest_walks view
    console.log('\n📈 Creating busiest_walks view...');
    await executeSql(`
      CREATE OR REPLACE VIEW busiest_walks AS
      SELECT
        from_loc,
        to_loc,
        COUNT(*) AS total_walks,
        AVG(joinedspots) AS avg_joins,
        MAX(joinedspots) AS peak_joins,
        (COUNT(*) * 0.6 + AVG(joinedspots) * 0.4) AS demand_score
      FROM walks
      GROUP BY from_loc, to_loc
      ORDER BY demand_score DESC
    `);
    console.log('✅ Busiest walks view created');

    // 9. Show results
    console.log('\n🏆 Busiest walks:');
    const busiestWalks = await executeSql('SELECT * FROM busiest_walks');
    console.log(busiestWalks);

    console.log('\n✨ Sync complete!');
    connection.destroy();

  } catch (err) {
    console.error('❌ Error:', err);
    connection.destroy();
    process.exit(1);
  }
}

// Run sync
syncWalksToSnowflake();