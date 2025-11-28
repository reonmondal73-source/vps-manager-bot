const mongoose = require('mongoose');

const VMSchema = new mongoose.Schema({
  vmId: {
    type: Number,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    unique: true
  },
  ownerId: {
    type: String,
    required: true
  },
  ownerUsername: {
    type: String,
    required: true
  },
  cpu: {
    type: Number,
    required: true
  },
  ram: {
    type: Number,
    required: true
  },
  disk: {
    type: Number,
    required: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  sshUsername: {
    type: String,
    required: true
  },
  sshPassword: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['running', 'stopped', 'paused', 'error'],
    default: 'stopped'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastStarted: {
    type: Date,
    default: null
  },
  node: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('VM', VMSchema);
