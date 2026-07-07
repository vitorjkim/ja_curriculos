/**
 * Migration: Add AI Analysis and Matching Support
 * Creates necessary tables and columns for resume analysis and job matching
 * 
 * Usage: node backend/migrations/001_add_ai_analysis.js
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to database');

    // ========================================================================
    // 1. Add columns to resumes table for AI analysis data
    // ========================================================================
    console.log('Adding columns to resumes table...');
    
    const alterResumesQueries = [
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS quality_score INTEGER DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS score_explanation TEXT DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_strengths JSONB DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_improvements JSONB DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS missing_keywords JSONB DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS suggested_courses JSONB DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS analysis_summary TEXT DEFAULT NULL;`,
      `ALTER TABLE resumes ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP DEFAULT NULL;`,
    ];

    for (const query of alterResumesQueries) {
      await client.query(query);
      console.log('✓', query.substring(0, 60) + '...');
    }

    // ========================================================================
    // 2. Add matching score column to applications table
    // ========================================================================
    console.log('\nAdding columns to applications table...');
    
    const alterApplicationsQueries = [
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS matching_score INTEGER DEFAULT NULL;`,
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS matching_details JSONB DEFAULT NULL;`,
      `ALTER TABLE applications ADD COLUMN IF NOT EXISTS ranking_position INTEGER DEFAULT NULL;`,
    ];

    for (const query of alterApplicationsQueries) {
      await client.query(query);
      console.log('✓', query.substring(0, 60) + '...');
    }

    // ========================================================================
    // 3. Create resume_analysis_history table for tracking changes
    // ========================================================================
    console.log('\nCreating resume_analysis_history table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS resume_analysis_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
        quality_score INTEGER,
        score_explanation TEXT,
        strengths JSONB,
        improvements JSONB,
        missing_keywords JSONB,
        recommendations JSONB,
        suggested_courses JSONB,
        analysis_summary TEXT,
        ai_provider VARCHAR(50),
        analysis_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ resume_analysis_history table created');

    // ========================================================================
    // 4. Create matching_history table for tracking matching changes
    // ========================================================================
    console.log('\nCreating matching_history table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS matching_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
        job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
        candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
        matching_score INTEGER,
        score_details JSONB,
        ranking_at_time INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ matching_history table created');

    // ========================================================================
    // 5. Create ai_cache table to avoid duplicate API calls
    // ========================================================================
    console.log('\nCreating ai_cache table...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_cache (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cache_key VARCHAR(255) UNIQUE NOT NULL,
        ai_provider VARCHAR(50),
        prompt_hash VARCHAR(64),
        response JSONB,
        ttl_hours INTEGER DEFAULT 168,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      );
    `);
    console.log('✓ ai_cache table created');

    // ========================================================================
    // 6. Create indexes for performance
    // ========================================================================
    console.log('\nCreating indexes...');
    
    const indexQueries = [
      `CREATE INDEX IF NOT EXISTS idx_resumes_quality_score ON resumes(quality_score);`,
      `CREATE INDEX IF NOT EXISTS idx_applications_matching_score ON applications(matching_score DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_applications_job_id_matching ON applications(job_id, matching_score DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_resume_analysis_history_resume_id ON resume_analysis_history(resume_id);`,
      `CREATE INDEX IF NOT EXISTS idx_matching_history_application_id ON matching_history(application_id);`,
      `CREATE INDEX IF NOT EXISTS idx_ai_cache_key ON ai_cache(cache_key);`,
      `CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);`,
    ];

    for (const query of indexQueries) {
      await client.query(query);
      console.log('✓', query.substring(0, 60) + '...');
    }

    // ========================================================================
    // 7. Create function to update matching scores in batch
    // ========================================================================
    console.log('\nCreating utility functions...');

    await client.query(`
      CREATE OR REPLACE FUNCTION update_ranking_positions(job_id_param UUID)
      RETURNS void AS $$
      BEGIN
        WITH ranked_apps AS (
          SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY matching_score DESC NULLS LAST) as rank
          FROM applications
          WHERE job_id = job_id_param
        )
        UPDATE applications
        SET ranking_position = ranked_apps.rank
        FROM ranked_apps
        WHERE applications.id = ranked_apps.id;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✓ update_ranking_positions function created');

    // ========================================================================
    // 8. Add user preferences for AI features
    // ========================================================================
    console.log('\nUpdating users table...');

    const alterUsersQueries = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_analysis_enabled BOOLEAN DEFAULT TRUE;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_ai_provider VARCHAR(50) DEFAULT 'openai';`,
    ];

    for (const query of alterUsersQueries) {
      await client.query(query);
      console.log('✓', query.substring(0, 60) + '...');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nNew tables created:');
    console.log('  - resume_analysis_history');
    console.log('  - matching_history');
    console.log('  - ai_cache');
    console.log('\nNew columns added:');
    console.log('  - resumes: quality_score, score_explanation, ai_strengths, ai_improvements, etc');
    console.log('  - applications: matching_score, matching_details, ranking_position');
    console.log('  - users: ai_analysis_enabled, preferred_ai_provider');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
