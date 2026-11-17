const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace reference is required'],
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'task_assignment',
          'card_comment',
          'workspace_join',
          'task_activity',
        ],
        message: 'Invalid notification type',
      },
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Notification title cannot exceed 150 characters'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Notification message cannot exceed 500 characters'],
    },
    resourceType: {
      type: String,
      enum: ['card', 'board', 'workspace'],
      default: 'card',
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for reverse-chronological retrieval per recipient
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Compound index for unread count and unread filtering
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Index for workspace-scoped notifications
notificationSchema.index({ workspace: 1, recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
