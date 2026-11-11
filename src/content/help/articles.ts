/**
 * The Help Centre articles. They ship with the app, so there is no data source to switch.
 * Every statement must be true of the app as built: mark sample-only or unconnected features
 * honestly, and never promise a feature that does not exist.
 */
export type HelpCategory = 'getting_started' | 'shipping' | 'billing' | 'integrations' | 'account';

export interface HelpArticle {
  slug: string;
  title: string;
  category: HelpCategory;
  summary: string;
  body: { heading: string; paragraphs: string[] }[];
}

export const HELP_CATEGORIES: { value: HelpCategory; label: string }[] = [
  { value: 'getting_started', label: 'Getting started' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'billing', label: 'Billing' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'account', label: 'Account' },
];

export const HELP_CATEGORY_VALUES = HELP_CATEGORIES.map((c) => c.value);

export function categoryLabel(category: HelpCategory): string {
  return HELP_CATEGORIES.find((c) => c.value === category)?.label ?? category;
}

export const ARTICLES: HelpArticle[] = [
  {
    slug: 'find-your-way-around',
    title: 'Find your way around the side menu',
    category: 'getting_started',
    summary: 'What each group in the side menu holds, and what a greyed-out item means.',
    body: [
      {
        heading: 'The menu groups',
        paragraphs: [
          'The side menu groups screens by the job they do. Shipping Management holds your shipments, shipment creation, bulk upload, and pickups and manifests. Operations holds NDR and RTO. Billings holds wallet transactions, COD remittance and invoices. Reconciliation holds weight discrepancies and weight settings. Tools holds the rate card, the rate calculator and order tracking.',
          'Home, Dashboard, Reports and Settings are single links. Help & Support closes the menu.',
        ],
      },
      {
        heading: 'Items that are greyed out',
        paragraphs: [
          'A greyed-out item is planned but not built yet. Point at it to see that it is not available yet. At the moment every item in the side menu is available.',
        ],
      },
      {
        heading: 'On a phone',
        paragraphs: [
          'On a phone the menu slides in from the side when you tap the menu button. On a larger screen you can collapse it to icons to make more room for the page.',
        ],
      },
    ],
  },
  {
    slug: 'what-sample-data-means',
    title: 'What "Sample data" means',
    category: 'getting_started',
    summary: 'Why some cards carry a Sample data label, and what to do about it.',
    body: [
      {
        heading: 'The label',
        paragraphs: [
          'A card marked Sample data shows made-up figures so you can see how the screen works. Nothing on it is about your real shipments, money or customers.',
        ],
      },
      {
        heading: 'Data that is not available yet',
        paragraphs: [
          'Some features are not connected to the live system yet. When the app is switched to the live system, those cards say "This data is not available yet" with a Try again button, instead of showing made-up figures.',
          'If a card says it could not reach the server, wait a moment and choose Try again. The rest of the page keeps working.',
        ],
      },
    ],
  },
  {
    slug: 'create-a-shipment',
    title: 'Create a shipment',
    category: 'getting_started',
    summary: 'Fill in the Create Shipment form, and what to expect when you submit it.',
    body: [
      {
        heading: 'Open the form',
        paragraphs: [
          'Choose Shipping Management, then Create Shipment. Fill in the pickup address, the delivery address, the parcel weight and size, what is inside, and whether the order is prepaid or cash on delivery. For cash on delivery, enter the amount to collect.',
        ],
      },
      {
        heading: 'What happens when you submit',
        paragraphs: [
          'With sample data, the form confirms that the manifest was generated as a sample simulation. No courier is booked and no money moves.',
          'Booking a real shipment is not available yet. The live system keeps shipment creation off until merchant sign-in is set up, so the form tells you it could not book the shipment. Submitting again is safe: the same request is never booked twice.',
        ],
      },
    ],
  },
  {
    slug: 'track-a-shipment',
    title: 'Track a shipment by AWB',
    category: 'shipping',
    summary: 'Look up where a parcel is, and share a tracking page with your buyer.',
    body: [
      {
        heading: 'Look up a shipment',
        paragraphs: [
          'Choose Tools, then Order Tracking. Enter one or more AWB numbers to see where each shipment is and what has happened so far. Tracking comes from the live tracking service, so it works even when other screens show sample data.',
        ],
      },
      {
        heading: 'The public tracking page',
        paragraphs: [
          'Each AWB also has a public page at /track followed by the AWB. Your buyer can open it without signing in. It shows the journey of the parcel and never shows an address, a phone number or a name.',
        ],
      },
    ],
  },
  {
    slug: 'book-many-shipments-from-a-csv',
    title: 'Book many shipments from a CSV file',
    category: 'shipping',
    summary: 'Use the template, check the preview, and book up to 200 shipments at once.',
    body: [
      {
        heading: 'Prepare the file',
        paragraphs: [
          'Choose Shipping Management, then Bulk Upload, and download the template. Add one shipment per row. A file can hold up to 200 rows and be up to 1 MB.',
        ],
      },
      {
        heading: 'Check, then book',
        paragraphs: [
          'After you choose the file, the page shows a preview with the number of valid and invalid rows. Fix invalid rows in the file and upload it again. Only valid rows are booked.',
          'Sending the same file twice never books a shipment twice. As with Create Shipment, real booking is not available yet, and the screen tells you so if the live system refuses.',
        ],
      },
    ],
  },
  {
    slug: 'schedule-a-pickup',
    title: 'Schedule a pickup and print the manifest',
    category: 'shipping',
    summary: 'Choose the shipments that are ready, book a courier pickup and print the manifest.',
    body: [
      {
        heading: 'Choose shipments',
        paragraphs: [
          'Choose Shipping Management, then Pickups & Manifests. The Ready to ship card lists shipments waiting for a courier. Select the ones you want collected together, then schedule the pickup.',
        ],
      },
      {
        heading: 'Print the manifest',
        paragraphs: [
          'Each scheduled pickup appears in the list below the Ready to ship card. Open it to print its manifest. Pickups currently show sample data, so no courier is called yet.',
        ],
      },
    ],
  },
  {
    slug: 'handle-a-failed-delivery',
    title: 'Handle a failed delivery (NDR)',
    category: 'shipping',
    summary: 'When a courier cannot deliver, ask for another attempt or send the parcel back.',
    body: [
      {
        heading: 'What an NDR is',
        paragraphs: [
          'NDR means non-delivery report. The courier tried to deliver and could not, for example because the buyer was away. Choose Operations, then NDR to see these shipments, the reason, and how many attempts were made.',
        ],
      },
      {
        heading: 'Your two choices',
        paragraphs: [
          'Request a re-attempt, with a preferred date and any instructions for the courier. Or start a return to origin, which sends the parcel back to you. Returned shipments are then listed under Operations, then RTO.',
          'The NDR screen currently shows sample data, so a choice you make is not sent to a courier yet.',
        ],
      },
    ],
  },
  {
    slug: 'add-money-to-your-wallet',
    title: 'Add money to your wallet',
    category: 'billing',
    summary: 'How much you can add, and what to expect when you press Recharge.',
    body: [
      {
        heading: 'Recharge',
        paragraphs: [
          'Choose Billings, then Wallet Transactions, and press Recharge. Enter a whole number of rupees from ₹100 to ₹5,00,000, or pick one of the quick amounts. Amounts with paise are not accepted.',
        ],
      },
      {
        heading: 'Before it is connected',
        paragraphs: [
          'Online payment is not connected yet. If you press Recharge against the live system, the app tells you recharge is not connected and that no payment was taken. The Wallet Transactions page also lists each change to your balance.',
        ],
      },
    ],
  },
  {
    slug: 'cod-remittance-and-invoices',
    title: 'COD remittance, invoices and reports',
    category: 'billing',
    summary: 'Where to see the cash couriers owe you, your monthly invoices, and CSV downloads.',
    body: [
      {
        heading: 'COD remittance',
        paragraphs: [
          'Choose Billings, then COD Remittance. The top cards show what has been remitted to date, the last remittance, the next expected one and the total still due. The list below shows each remittance.',
        ],
      },
      {
        heading: 'Invoices',
        paragraphs: [
          'Billings, then Invoice, lists your monthly shipping invoices with GST. Open one to see its detail.',
        ],
      },
      {
        heading: 'Reports',
        paragraphs: [
          'Choose Reports, pick a date range and download a report as a CSV file that opens in any spreadsheet. These screens currently show sample data.',
        ],
      },
    ],
  },
  {
    slug: 'weight-discrepancies',
    title: 'Respond to a weight discrepancy',
    category: 'billing',
    summary: 'A courier charged for more weight than you declared. Accept it or dispute it in time.',
    body: [
      {
        heading: 'Why it happens',
        paragraphs: [
          'Couriers bill the larger of the real weight and the volumetric weight, which comes from the parcel size. If their weight is higher than the one you declared, an extra charge appears under Reconciliation, then Weight.',
        ],
      },
      {
        heading: 'Accept or dispute',
        paragraphs: [
          'Accept the charge, or dispute it with photos of the parcel. Respond before the response window closes. After that, only Accept is left.',
          'To avoid surprises, save your usual parcel sizes under Reconciliation, then Weight Settings. Both screens currently show sample data.',
        ],
      },
    ],
  },
  {
    slug: 'get-shipment-updates-by-webhook',
    title: 'Get shipment updates by webhook',
    category: 'integrations',
    summary: 'Have Evoc Logistics call your server when a shipment is booked, changes status or fails.',
    body: [
      {
        heading: 'Add a webhook',
        paragraphs: [
          'Open Channel Integrations, at /channel-integrations. The side menu does not link to it yet, so type the address in your browser. Add a webhook with the address of your server, and choose the events you want: shipment.created, shipment.status.updated and shipment.failed.',
        ],
      },
      {
        heading: 'Save your signing secret',
        paragraphs: [
          'When you add a webhook, the app shows a signing secret once. Copy it straight away and keep it safe, because you will not see it again. Use a separate secret for each webhook.',
        ],
      },
      {
        heading: 'Delivery history',
        paragraphs: [
          'The Delivery history card lists each delivery and lets you retry one. Live delivery of events is not connected yet, so you may see no real deliveries for now.',
        ],
      },
    ],
  },
  {
    slug: 'verify-a-webhook-signature',
    title: 'Verify a webhook signature',
    category: 'integrations',
    summary: 'Check that a webhook really came from us before you act on it.',
    body: [
      {
        heading: 'The headers',
        paragraphs: [
          'Save the secret you got when you created the webhook. Each request is a POST with three headers.',
          'X-LogiCore-Event-Id is a stable event ID. Use it to ignore repeated deliveries of the same event.',
          'X-LogiCore-Timestamp is the Unix time in seconds when this attempt was signed.',
          'X-LogiCore-Signature is "sha256=" followed by the HMAC-SHA256 of the timestamp, a full stop, and the raw body, signed with your secret.',
        ],
      },
      {
        heading: 'How to check it',
        paragraphs: [
          'Verify the signature before you parse the JSON. Use the exact bytes you received, because parsing and re-saving the body can change the signature.',
          'Reject a request whose timestamp is outside your freshness window, for example five minutes. Compare the signature you work out with the one in the header using a constant-time comparison. Then store the event ID so a retry does not repeat your business action.',
          'Reply with any 2xx status once you have accepted the event.',
        ],
      },
      {
        heading: 'Status',
        paragraphs: [
          'The sender exists as an internal component. Live event delivery and the retry worker are not connected yet, so treat this as how to build your receiver ahead of time.',
        ],
      },
    ],
  },
  {
    slug: 'settings-and-profile',
    title: 'Settings, your profile and team members',
    category: 'account',
    summary: 'What you can and cannot change in the app today.',
    body: [
      {
        heading: 'Not available yet',
        paragraphs: [
          'Settings is available with your Profile, Company & KYC, Users & Roles, Buyer Notifications and a link to Channel Integrations. Pickup addresses and the tracking page are still planned and show as Not available yet on the Settings page.',
        ],
      },
      {
        heading: 'What is available',
        paragraphs: [
          'Profile is available now, under Settings. You can change your name and phone number and set a new password. Your sign-in email is shown but cannot be changed there. The Profile screen currently uses sample data.',
          'Company & KYC is available now, under Settings. Enter your legal and brand name, GSTIN, PAN, registered address and bank account, then add a GST certificate, a PAN card and a cancelled cheque as PDF, JPG or PNG files up to 5 MB each. After you submit, the status shows Submitted for review, and only the last 4 digits of your account number are shown. This screen currently uses sample data, and the files are not stored yet.',
          'Webhooks and their signing secrets are available now, in Channel Integrations. See the article on getting shipment updates by webhook.',
          'Users & Roles is available now, under Settings. You can invite a teammate by email, choose their role (Admin, Operations, Finance or Viewer), change a role later and remove someone. You cannot change your own role or remove yourself, and at least one admin must always remain. The team list currently uses sample data, and in sample mode any signed-in user can make these changes; role-based limits come with the real backend.',
          'Buyer Notifications is available now, under Settings. Choose which channels (SMS, Email or WhatsApp) send a message when a parcel is manifested, in transit, out for delivery, delivered or being returned, and edit the message for each. A message can use {{buyer_name}}, {{awb}}, {{courier}}, {{tracking_link}} and {{store_name}}, and the preview shows it with sample values. Any other variable stops you saving, and an SMS over 160 characters is sent as more than one message. This screen currently uses sample data.',
        ],
      },
    ],
  },
  {
    slug: 'get-help-from-us',
    title: 'Get help from our team',
    category: 'account',
    summary: 'Where to look first, and how to ask for help.',
    body: [
      {
        heading: 'Look here first',
        paragraphs: ['Search this Help Centre with the search box, or pick a topic to narrow the list.'],
      },
      {
        heading: 'Raise a ticket',
        paragraphs: [
          'Every article ends with a Raise a ticket link. It opens the Support Tickets screen with the new ticket form ready. Give a short subject, pick a category, add one AWB if the problem is about a shipment, and describe what happened. Replies from support appear in the ticket, and replying to a resolved ticket reopens it. Tickets currently show sample data, so nothing you raise reaches a person yet.',
        ],
      },
    ],
  },
];
