# AESTIQ

Create a mobile-first web management system for advanced 

aesthetic clinics called AESTIQ. Use Supabase for 

authentication and database.

DESIGN SYSTEM:

- Primary color: #2A9D8F (teal)

- Dark color: #1A2E35 (charcoal green)

- Background: #FAFAF9 (warm white)

- Surface: #F0F9F8 (light mint)

- Text: #1C1C1E

- Secondary text: #6B7280

- Accent: #E8937A (soft salmon)

- Typography: Inter (all weights)

- Style: minimalist, flat, no gradients, no shadows

Required screens:

1. Login screen with email and password via Supabase Auth

2. Dashboard with two sections: today's appointments 

   and pending return alerts

3. Weekly agenda with clickable time slots

4. New appointment form with fields: client name, 

   procedure, date, time, notes, and static Pix QR Code 

   generation for deposit payment

5. Client list with name search

6. Client record with procedure history and photo gallery

7. New procedure form with fields: date, procedure, 

   product lot number, days until return (default 15), 

   and before/after photo upload

8. Return alerts list with WhatsApp message button

9. Anamnesis form linked to client record, filled once 

   and updatable. Fields: chronic diseases, medications, 

   allergies, aesthetic procedure history, skin type, 

   keloid history, pregnancy or breastfeeding. 

   Mandatory LGPD consent checkbox with automatic 

   date and time stamp.

All UI text, labels, buttons and messages must be 

in Brazilian Portuguese.

Large thumb-friendly buttons. Mobile-first layout.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://aestiq-flow.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f095a746-e6af-4601-96d4-b589357e05e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
