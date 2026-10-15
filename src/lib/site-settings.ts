export type SiteSettings = {
  availabilityLabel: string;
  priceOnRequestLabel: string;
  askingPriceLabel: string;
  includedLabel: string;
  transferLabel: string;
  transferValue: string;
  paymentLabel: string;
  paymentValue: string;
  ownershipLabel: string;
  ownershipValue: string;
  buttonLabel: string;
  contactLabel: string;
  contactEmail: string;
  portfolioLabel: string;
};

export const defaultSiteSettings: SiteSettings = {
  availabilityLabel: "AVAILABLE DOMAIN",
  priceOnRequestLabel: "PRICING",
  askingPriceLabel: "ASKING PRICE",
  includedLabel: "domain included",
  transferLabel: "Transfer",
  transferValue: "Via Escrow.com",
  paymentLabel: "Payment",
  paymentValue: "Held by Escrow",
  ownershipLabel: "Ownership",
  ownershipValue: "To your registrar",
  buttonLabel: "MAKE AN INQUIRY",
  contactLabel: "CONTACT US",
  contactEmail: "spa.jeton@gmail.com",
  portfolioLabel: "VIEW OUR FULL PORTFOLIO",
};

export function siteSettingsFromRow(row: Record<string, unknown>): SiteSettings {
  return {
    availabilityLabel: String(row.availability_label ?? defaultSiteSettings.availabilityLabel),
    priceOnRequestLabel: String(row.price_on_request_label ?? defaultSiteSettings.priceOnRequestLabel),
    askingPriceLabel: String(row.asking_price_label ?? defaultSiteSettings.askingPriceLabel),
    includedLabel: String(row.included_label ?? defaultSiteSettings.includedLabel),
    transferLabel: String(row.transfer_label ?? defaultSiteSettings.transferLabel),
    transferValue: String(row.transfer_value ?? defaultSiteSettings.transferValue),
    paymentLabel: String(row.payment_label ?? defaultSiteSettings.paymentLabel),
    paymentValue: String(row.payment_value ?? defaultSiteSettings.paymentValue),
    ownershipLabel: String(row.ownership_label ?? defaultSiteSettings.ownershipLabel),
    ownershipValue: String(row.ownership_value ?? defaultSiteSettings.ownershipValue),
    buttonLabel: String(row.button_label ?? defaultSiteSettings.buttonLabel),
    contactLabel: String(row.contact_label ?? defaultSiteSettings.contactLabel),
    contactEmail: String(row.contact_email ?? defaultSiteSettings.contactEmail),
    portfolioLabel: String(row.portfolio_label ?? defaultSiteSettings.portfolioLabel),
  };
}
