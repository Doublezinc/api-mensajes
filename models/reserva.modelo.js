const { Schema, model } = require('mongoose');

const AddressSchema = new Schema({
  street: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  postalCode: { type: String, trim: true, default: '' },
  housingType: { type: String, trim: true, default: '' },
  floor: { type: String, trim: true, default: '0' },
  elevator: { type: Boolean, default: null },
  accessNotes: { type: String, trim: true, default: '' }
}, { _id: false });

const ReservaSchema = new Schema({
  quoteId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    immutable: true
  },
  language: {
    type: String,
    required: true,
    enum: ['fr', 'en', 'es']
  },
  contact: {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    moveDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true
    }
  },
  addresses: {
    departure: { type: AddressSchema, required: true },
    destination: { type: AddressSchema, required: true }
  },
  details: {
    type: Schema.Types.Mixed,
    required: true
  },
  reservation: {
    termsAccepted: { type: Boolean, required: true },
    acceptedAt: { type: Date, required: true },
    termsVersion: { type: String, required: true }
  },
  estimate: {
    type: Schema.Types.Mixed,
    required: true
  },
  depositInstructions: {
    type: Schema.Types.Mixed,
    required: true
  },
  cancellationDeadlineHours: {
    type: Number,
    default: 48
  },
  contractAccessTokenHash: {
    type: String,
    required: true,
    select: false
  },
  status: {
    type: String,
    enum: [
      'request_received',
      'awaiting_deposit',
      'deposit_received',
      'confirmed',
      'completed',
      'cancelled'
    ],
    default: 'awaiting_deposit',
    index: true
  },
  statusNotes: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  statusUpdatedAt: {
    type: Date,
    default: Date.now
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  depositRefundable: {
    type: Boolean,
    default: null
  },
  depositStatus: {
    type: String,
    enum: ['pending', 'received'],
    default: 'pending',
    index: true
  },
  depositReceivedAt: {
    type: Date,
    default: null
  },
  depositReference: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  emailStatus: {
    type: String,
    enum: ['pending', 'sending', 'sent', 'failed'],
    default: 'pending'
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  emailClaimedAt: {
    type: Date,
    default: null
  },
  emailError: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

ReservaSchema.index({ createdAt: -1 });
ReservaSchema.index({ status: 1, createdAt: -1 });

ReservaSchema.methods.toJSON = function () {
  const { _id, ...reservation } = this.toObject();
  reservation.uid = _id;
  return reservation;
};

module.exports = model('Reserva', ReservaSchema);
