import test from 'node:test'
import assert from 'node:assert/strict'

import { buildInvitationLink, normalizeVerificationCode } from '../src/controllers/authController.js'
import { resolveSendgridFromAddress, decideEmailFallbackRoute, getPrimaryEmailSender } from '../src/utils/emailService.js'

test('normalizeVerificationCode strips spaces and non-digits before validating an 8-digit code', () => {
  assert.equal(normalizeVerificationCode(' 1234 5678 '), '12345678')
  assert.equal(normalizeVerificationCode('12-34-56-78'), '12345678')
  assert.equal(normalizeVerificationCode('12345678'), '12345678')
})

test('buildInvitationLink uses the canonical MiitVerse Vercel origin and encodes the email safely', () => {
  assert.equal(
    buildInvitationLink('student@miit.edu.mm'),
    'https://miitverse-xi.vercel.app/register?email=student%40miit.edu.mm'
  )
})

test('resolveSendgridFromAddress avoids personal mailbox senders that hurt delivery', () => {
  assert.equal(resolveSendgridFromAddress('miitverse_auth@hotmail.com'), 'noreply@sendgrid.net')
  assert.equal(resolveSendgridFromAddress('noreply@miitverse.com'), 'noreply@miitverse.com')
  assert.equal(resolveSendgridFromAddress(''), 'noreply@sendgrid.net')
})

test('decideEmailFallbackRoute prefers SendGrid and falls back to Gmail SMTP when needed', () => {
  assert.deepEqual(decideEmailFallbackRoute({ sendgridEnabled: true, gmailEnabled: false }), ['sendgrid', 'none'])
  assert.deepEqual(decideEmailFallbackRoute({ sendgridEnabled: false, gmailEnabled: true }), ['gmail', 'none'])
  assert.deepEqual(decideEmailFallbackRoute({ sendgridEnabled: true, gmailEnabled: true }), ['sendgrid', 'gmail'])
})

test('getPrimaryEmailSender resolves the configured sender for the active provider', () => {
  assert.equal(getPrimaryEmailSender('sendgrid', 'noreply@miitverse.com', 'MiitVerse'), 'noreply@miitverse.com')
  assert.equal(getPrimaryEmailSender('gmail', 'notify@gmail.com', 'MiitVerse'), 'notify@gmail.com')
})
