// Initialize MongoDB with user and database
db = db.getSiblingDB('hireiq_db');

// Create application user
db.createUser({
  user: 'hireiq_user',
  pwd: 'hireiq_password',
  roles: [
    {
      role: 'readWrite',
      db: 'hireiq_db'
    }
  ]
});

// Create collections and indexes
db.createCollection('candidates');
db.createCollection('evaluations');
db.createCollection('interviews');

// Create indexes for better performance
db.candidates.createIndex({ "email": 1 }, { unique: true });
db.candidates.createIndex({ "created_at": -1 });
db.evaluations.createIndex({ "candidate_id": 1 });
db.interviews.createIndex({ "candidate_id": 1 });

print('MongoDB initialization completed successfully!');
