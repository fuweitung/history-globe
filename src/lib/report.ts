/** "Report a mistake" Google Form. Entry IDs come from the form's own fields ("Which page?" is the first). */
const FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSf9bgR9PnpobNyCZ31s3LPuJWfD5Eph9uYQ8Ef-12do3CO2bQ/viewform';
const PAGE_ENTRY = 'entry.1061031398';

/** Link to the form with "Which page?" pre-filled (e.g. the civilisation or event name). */
export function reportUrl(page?: string): string {
  if (!page) return FORM;
  return `${FORM}?usp=pp_url&${PAGE_ENTRY}=${encodeURIComponent(page)}`;
}
