#!/bin/bash

# ------------------------------------------
# 🚀 Firebase Deploy Script for poll-zone
# ------------------------------------------

PROJECT_ID="poll-zone"
FIREBASE_CONFIG_FILE="firebase.json"
FIREBASE_RC_FILE=".firebaserc"
RULES_FILE="firestore.rules"

echo "🔥 Starting deployment for Firebase project: $PROJECT_ID"

# 1. Ensure Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI not found. Install it: npm i -g firebase-tools"
  exit 1
fi

# 2. Set Firebase project (will also create .firebaserc)
if [ ! -f "$FIREBASE_RC_FILE" ]; then
  echo "📦 Creating .firebaserc..."
  echo "{ \"projects\": { \"default\": \"$PROJECT_ID\" } }" > "$FIREBASE_RC_FILE"
fi

# 3. Ensure firestore.rules file exists
if [ ! -f "$RULES_FILE" ]; then
  echo "🛡️ Creating default $RULES_FILE..."
  cat <<EOF > "$RULES_FILE"
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read, write: if true; // ⚠️ Dev-only, tighten in prod
    }
  }
}
EOF
fi

# 4. Ensure firebase.json exists
if [ ! -f "$FIREBASE_CONFIG_FILE" ]; then
  echo "⚙️ Creating default $FIREBASE_CONFIG_FILE..."
  cat <<EOF > "$FIREBASE_CONFIG_FILE"
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  },
  "emulators": {
    "firestore": {
      "host": "127.0.0.1",
      "port": 8088,
      "rules": "firestore.rules"
    },
    "ui": {
      "enabled": true,
      "host": "127.0.0.1",
      "port": 4000
    }
  }
}
EOF
fi

# 5. Build the project using Bun & Vite
echo "🛠️ Building Vite app..."
bunx vite build

# 6. Deploy hosting + firestore
echo "🚀 Deploying to Firebase..."
firebase deploy --only firestore,hosting --project "$PROJECT_ID"

echo "✅ Deployment complete for $PROJECT_ID!"
