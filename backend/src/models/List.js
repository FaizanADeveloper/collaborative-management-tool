const mongoose = require('mongoose');

const listSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'List name is required'],
      trim: true,
      minlength: [1, 'List name must be at least 1 character'],
      maxlength: [100, 'List name cannot exceed 100 characters'],
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',
      required: [true, 'Board reference is required'],
      index: true,
    },
    position: {
      type: Number,
      required: [true, 'Position is required'],
      default: 1000,
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

// Compound index for querying board lists in deterministic position order
listSchema.index({ board: 1, position: 1, createdAt: 1 });

const List = mongoose.model('List', listSchema);

module.exports = List;
