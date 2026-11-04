const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

describe('User Model Unit Tests', () => {
  describe('Schema Validation', () => {
    it('should validate a valid user object successfully', async () => {
      const validUserData = {
        name: 'Alex Morgan',
        email: 'ALEX.MORGAN@example.com',
        password: 'Password123',
      };

      const user = new User(validUserData);
      await expect(user.validate()).resolves.toBeUndefined();
      // Verifies email normalization (lowercase)
      expect(user.email).toBe('alex.morgan@example.com');
    });

    it('should fail validation if required fields are missing', async () => {
      const user = new User({});
      let validationError;
      try {
        await user.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
    });

    it('should fail validation for an invalid email format', async () => {
      const user = new User({
        name: 'Alex Morgan',
        email: 'invalid-email-format',
        password: 'Password123',
      });
      let validationError;
      try {
        await user.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.email).toBeDefined();
      expect(validationError.errors.email.message).toMatch(/valid email/);
    });

    it('should fail validation if password is shorter than 8 characters', async () => {
      const user = new User({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'short',
      });
      let validationError;
      try {
        await user.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.password).toBeDefined();
      expect(validationError.errors.password.message).toMatch(/at least 8 characters/);
    });

    it('should fail validation if name is shorter than 2 characters', async () => {
      const user = new User({
        name: 'A',
        email: 'alex@example.com',
        password: 'Password123',
      });
      let validationError;
      try {
        await user.validate();
      } catch (err) {
        validationError = err;
      }

      expect(validationError).toBeDefined();
      expect(validationError.errors.name).toBeDefined();
    });

  });

  describe('Password Hashing & Comparison', () => {
    it('should correctly hash the password and verify using comparePassword', async () => {
      const plainPassword = 'SuperSecretPassword123';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      const user = new User({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: hashedPassword,
      });

      const isMatch = await user.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isNotMatch = await user.comparePassword('WrongPassword');
      expect(isNotMatch).toBe(false);
    });

    it('should throw an error if comparePassword is called when password is not selected', async () => {
      const user = new User({
        name: 'Alex Morgan',
        email: 'alex@example.com',
      });
      user.password = undefined;

      await expect(user.comparePassword('anyPassword')).rejects.toThrow(
        'Password field is not selected in query'
      );
    });
  });

  describe('JSON Serialization Safety', () => {
    it('should omit password and __v, and map _id to id in toJSON output', async () => {
      const user = new User({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'Password123',
      });

      const userJson = user.toJSON();

      expect(userJson).toHaveProperty('id');
      expect(userJson).not.toHaveProperty('_id');
      expect(userJson).not.toHaveProperty('password');
      expect(userJson).not.toHaveProperty('__v');
      expect(userJson.email).toBe('alex@example.com');
      expect(userJson.name).toBe('Alex Morgan');
    });
  });

  describe('Direct Query Update Security Enforcement', () => {
    it('should block findOneAndUpdate when password is in the update object', async () => {
      const query = User.findOneAndUpdate({}, { password: 'NewUnsafePassword123' });
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block updateOne when password is in $set', async () => {
      const query = User.updateOne({}, { $set: { password: 'NewUnsafePassword123' } });
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block updateMany when password is in the update object', async () => {
      const query = User.updateMany({}, { password: 'NewUnsafePassword123' });
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block replaceOne when password is in the replacement object', async () => {
      const query = User.replaceOne({}, { name: 'Alex', password: 'NewUnsafePassword123' });
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block findOneAndReplace when password is in the replacement object', async () => {
      const query = User.findOneAndReplace({}, { name: 'Alex', password: 'NewUnsafePassword123' });
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block findByIdAndUpdate when password is in the update object', async () => {
      const query = User.findByIdAndUpdate('507f191e810c19729de860ea', { password: 'NewUnsafePassword123' });
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block update pipeline with $replaceWith containing a password', async () => {
      const query = User.updateOne(
        {},
        [{ $replaceWith: { name: 'Alex', password: 'NewUnsafePassword123' } }],
        { updatePipeline: true }
      );
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block update pipeline with $replaceRoot containing a password in newRoot', async () => {
      const query = User.updateOne(
        {},
        [{ $replaceRoot: { newRoot: { password: 'NewUnsafePassword123' } } }],
        { updatePipeline: true }
      );
      await expect(query.exec()).rejects.toThrow(
        /Direct password modification via query update methods is forbidden/
      );
    });

    it('should block bulkWrite when updateOne operation contains a password', async () => {
      const bulkPromise = User.bulkWrite([
        { updateOne: { filter: {}, update: { password: 'NewUnsafePassword123' } } },
      ]);
      await expect(bulkPromise).rejects.toThrow(
        /Direct password modification via bulkWrite is forbidden/
      );
    });

    it('should block bulkWrite when insertOne operation contains a password', async () => {
      const bulkPromise = User.bulkWrite([
        { insertOne: { document: { name: 'Alex', email: 'alex@example.com', password: 'NewUnsafePassword123' } } },
      ]);
      await expect(bulkPromise).rejects.toThrow(
        /Direct password modification via bulkWrite is forbidden/
      );
    });
  });
});
