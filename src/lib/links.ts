// Links read from a flyer's QR codes. Kept free of server code so the post form can use the labels too.

export const LINK_KINDS = ["whatsapp", "whatsapp-group", "instagram", "map", "form", "website"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export type FlyerLink = { kind: LinkKind; url: string };

export const LINK_LABELS: Record<LinkKind, string> = {
  whatsapp: "WhatsApp them",
  "whatsapp-group": "Join the WhatsApp group",
  instagram: "Instagram",
  map: "Location on Google Maps",
  form: "Register / book",
  website: "Website / tickets",
};
