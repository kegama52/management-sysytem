pipeline {
  agent any

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        dir('frontend') {
          sh 'npm ci'
        }
      }
    }

    stage('Run Automated Tests') {
      steps {
        dir('frontend') {
          sh 'npm run cy:run'
        }
      }
    }

    stage('Build & Deploy') {
      steps {
        sh 'docker build -t tiisgs-frontend ./frontend'
        sh 'docker build -t tiisgs-backend ./backend'
      }
    }
  }
}
