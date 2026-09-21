/**
 * Cloud Functions for SMV Platform
 *
 * Includes:
 *   1. onUserCreate     — sets custom claims when a user doc is created
 *   2. onOperationWrite — recomputes OB totals when operations change
 *   3. stripeWebhook    — handles Stripe subscription lifecycle events
 *
 * Deploy with: `firebase deploy --only functions`
 */

import { onDocumentWritten, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

initializeApp();
const db = getFirestore();
const auth = getAuth();

// Run everything in the same region — keep latency low
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

// =============================================================================
// 1. Set custom claims on user create
// =============================================================================

export const onUserCreate = onDocumentCreated('users/{userId}', async (event) => {
  const data = event.data?.data();
  const userId = event.params.userId;
  if (!data) return;

  try {
    await auth.setCustomUserClaims(userId, {
      tenantId: data.tenantId,
      role: data.role,
    });
    console.log(`[onUserCreate] claims set for ${userId} (tenant: ${data.tenantId}, role: ${data.role})`);
  } catch (err) {
    console.error('[onUserCreate] failed to set claims', err);
  }
});

// =============================================================================
// 2. Recompute Operation Bulletin totals when operations change
// =============================================================================

interface OperationDoc {
  styleId: string;
  smv: number;
  section: string;
  machineType: string;
  isHelper: boolean;
}

export const onOperationWrite = onDocumentWritten(
  'tenants/{tenantId}/operations/{operationId}',
  async (event) => {
    const tenantId = event.params.tenantId as string;
    const before = event.data?.before.data() as OperationDoc | undefined;
    const after = event.data?.after.data() as OperationDoc | undefined;

    const styleId = after?.styleId || before?.styleId;
    if (!styleId) return;

    // Re-query all operations for this style
    const snap = await db
      .collection(`tenants/${tenantId}/operations`)
      .where('styleId', '==', styleId)
      .get();

    const ops = snap.docs.map((d) => d.data() as OperationDoc);

    const totals = {
      operationCount: ops.length,
      totalSmv: round(ops.reduce((sum, op) => sum + (op.smv || 0), 0), 4),
      smvBySection: {
        cutting: 0,
        preparation: 0,
        assembly: 0,
        finishing: 0,
        packing: 0,
      } as Record<string, number>,
      smvByMachine: {} as Record<string, number>,
      uniqueMachineCount: 0,
      helperCount: 0,
      machinistCount: 0,
    };

    for (const op of ops) {
      if (op.section in totals.smvBySection) {
        totals.smvBySection[op.section] = round(
          (totals.smvBySection[op.section] || 0) + op.smv,
          4
        );
      }
      totals.smvByMachine[op.machineType] = round(
        (totals.smvByMachine[op.machineType] || 0) + op.smv,
        4
      );
      if (op.isHelper) totals.helperCount += 1;
      else totals.machinistCount += 1;
    }
    totals.uniqueMachineCount = Object.keys(totals.smvByMachine).filter(
      (m) => m !== 'MANUAL' && (totals.smvByMachine[m] || 0) > 0
    ).length;

    // Update the style's calculated SMV
    await db.doc(`tenants/${tenantId}/styles/${styleId}`).update({
      calculatedSmv: totals.totalSmv,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update/create the operation bulletin
    const obQuery = await db
      .collection(`tenants/${tenantId}/operationBulletins`)
      .where('styleId', '==', styleId)
      .limit(1)
      .get();

    if (obQuery.empty) {
      await db.collection(`tenants/${tenantId}/operationBulletins`).add({
        styleId,
        version: 1,
        status: 'draft',
        totals,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await obQuery.docs[0]!.ref.update({
        totals,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    console.log(`[onOperationWrite] OB recomputed for style ${styleId}`);
  }
);

// =============================================================================
// 3. Stripe webhook handler
// =============================================================================

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const stripeWebhook = onRequest({ cors: false }, async (req, res) => {
  if (!STRIPE_SECRET || !STRIPE_WEBHOOK_SECRET) {
    res.status(500).send('Stripe not configured');
    return;
  }
  const stripe = new Stripe(STRIPE_SECRET);

  let event: Stripe.Event;
  try {
    const sig = req.headers['stripe-signature'] as string;
    event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripeWebhook] invalid signature', err);
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId) break;
        await db.doc(`tenants/${tenantId}`).update({
          'subscription.status': sub.status,
          'subscription.stripeSubscriptionId': sub.id,
          'subscription.currentPeriodEnd': new Date((sub as any).current_period_end * 1000),
          updatedAt: FieldValue.serverTimestamp(),
        });
        console.log(`[stripeWebhook] updated subscription for tenant ${tenantId}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const tenantId = sub.metadata?.tenantId;
        if (!tenantId) break;
        await db.doc(`tenants/${tenantId}`).update({
          'subscription.status': 'canceled',
          'subscription.plan': 'free',
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;
      }
      default:
        // Other events ignored
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripeWebhook] handler error', err);
    res.status(500).send('Webhook handler error');
  }
});

// =============================================================================
// Utilities
// =============================================================================

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
