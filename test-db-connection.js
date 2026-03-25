import 'dotenv/config';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
console.log('Testing connection to:', connectionString?.replace(/:[^@]+@/, ':***@'));

const client = new pg.Client({
  connectionString,
  ssl: { 
    rejectUnauthorized: false,
    requestCert: false,
    keepalives: 1
  }
});

client.connect((err) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }
  console.log('✓ Connection successful!');
  client.query('SELECT NOW()', (err, result) => {
    if (err) {
      console.error('Query error:', err.message);
    } else {
      console.log('✓ Database time:', result.rows[0].now);
    }
    client.end();
  });
});
