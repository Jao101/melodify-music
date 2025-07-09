# ✅ Stripe Webhooks - Komplette Einrichtung

## Status: Webhook Secret ist bereits konfiguriert! 

Der Webhook Secret `whsec_y15k5Nuqn1abpZw92aUHGeADwjmxulF4` wurde erfolgreich gesetzt.

## 🎯 Jetzt im Stripe Dashboard konfigurieren

### Schritt 1: Stripe Dashboard öffnen
1. Gehe zu [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Melde dich an
3. **WICHTIG**: Stelle sicher, dass du im **Test Mode** bist (Toggle oben rechts)

### Schritt 2: Webhook Endpoint erstellen
1. Klicke links auf **"Developers"**
2. Klicke auf **"Webhooks"**
3. Klicke auf **"Add endpoint"** (blauer Button)

### Schritt 3: Endpoint URL eingeben
```
https://evsmhffvcdhtgcrthpoh.supabase.co/functions/v1/stripe-webhook
```

### Schritt 4: Events auswählen
Klicke auf **"Select events"** und wähle diese Events:

**✅ Erforderliche Events:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Optional (für erweiterte Funktionen):**
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### Schritt 5: Webhook erstellen
1. Klicke auf **"Add endpoint"**
2. Der Webhook wird erstellt

### Schritt 6: Webhook Secret überprüfen
1. Klicke auf den neu erstellten Webhook
2. Scrolle zu **"Signing secret"**
3. Klicke auf **"Reveal"**
4. Überprüfe, dass der Secret mit diesem beginnt: `whsec_y15k5Nuqn1abpZw92a...`

## ✅ Status Check

### Was bereits erledigt ist:
- ✅ Webhook Secret in Supabase gesetzt
- ✅ Edge Function `stripe-webhook` deployed
- ✅ Lokale `.env.local` aktualisiert
- ✅ Manuelle Subscription-Updates als Fallback implementiert

### Was du jetzt tun musst:
- ⏳ Webhook Endpoint im Stripe Dashboard erstellen (siehe Schritte oben)

## 🧪 Testing der Webhook-Integration

### Nach der Stripe Dashboard Konfiguration:

1. **Test Subscription:**
   ```bash
   npm run dev
   ```
   - Gehe zu Subscription Plans
   - Wähle einen Plan
   - Checkout mit Testkarte: `4242 4242 4242 4242`

2. **Webhook Logs überprüfen:**
   - Stripe Dashboard → Webhooks → Dein Endpoint → "Events" Tab
   - Supabase Dashboard → Functions → stripe-webhook → Logs

3. **Datenbank überprüfen:**
   - Supabase Dashboard → Table Editor → profiles
   - Schaue ob `subscription_tier` und `subscription_end` korrekt aktualisiert wurden

## 🔧 Troubleshooting

### Falls Webhooks nicht funktionieren:
1. **URL korrekt?** `https://evsmhffvcdhtgcrthpoh.supabase.co/functions/v1/stripe-webhook`
2. **Events ausgewählt?** Mindestens `checkout.session.completed`
3. **Test Mode?** Sowohl Stripe als auch Supabase müssen im Test Mode sein

### Fallback funktioniert trotzdem:
- Die manuelle Subscription-Update Funktion funktioniert weiterhin
- Webhooks sind zusätzliche Sicherheit für Production

## 🚀 Nächste Schritte

1. **Stripe Dashboard konfigurieren** (siehe Schritte oben)
2. **Testen** mit einer Test-Subscription
3. **Für Production:** Live Keys konfigurieren

## 📞 Hilfe benötigt?

Falls Probleme auftreten:
1. Überprüfe die Supabase Function Logs
2. Überprüfe die Stripe Webhook Event Logs
3. Die manuelle Subscription-Update Funktion funktioniert als Fallback

**Die Integration ist zu 90% fertig - nur noch der Stripe Dashboard Teil! 🎉**
