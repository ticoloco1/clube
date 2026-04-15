/**
 * Alias do webhook principal — mesmo handler que `/api/webhook/stripe`.
 * Muitos dashboards Stripe usam este URL para Connect; antes a rota não existia na app.
 */
export { dynamic, POST } from '../../../webhook/stripe/route';
