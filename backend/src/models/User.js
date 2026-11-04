const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Pre-save hook to hash password before persisting
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Recursively inspects any object, array, or update pipeline for the presence of the 'password' field
 */
const containsPasswordKey = (target) => {
  if (!target || typeof target !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(target, 'password')) return true;

  if (Array.isArray(target)) {
    return target.some((item) => containsPasswordKey(item));
  }

  return Object.values(target).some(
    (val) => typeof val === 'object' && containsPasswordKey(val)
  );
};

// Enforce document-save workflow: block direct query-level password updates
const blockDirectPasswordUpdate = function () {
  const update = this.getUpdate();
  if (!update) return;

  if (containsPasswordKey(update)) {
    throw new Error(
      'Direct password modification via query update methods is forbidden. Passwords must be updated via document.save() to ensure secure hashing and validation.'
    );
  }
};

userSchema.pre(
  ['updateOne', 'updateMany', 'findOneAndUpdate', 'findOneAndReplace', 'replaceOne'],
  blockDirectPasswordUpdate
);

// Intercept Model.bulkWrite() to prevent bulk bypass of password security
userSchema.pre('bulkWrite', function (ops) {
  if (!Array.isArray(ops)) return;

  for (const op of ops) {
    const action = op.updateOne || op.updateMany || op.replaceOne || op.insertOne;
    const payload = action?.update || action?.document;
    if (payload && containsPasswordKey(payload)) {
      throw new Error(
        'Direct password modification via bulkWrite is forbidden. Passwords must be updated via document.save() to ensure secure hashing and validation.'
      );
    }
  }
});

// Instance method to compare candidate password against hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error('Password field is not selected in query');
  }
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
