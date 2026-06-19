// src/utils/index.ts

/**
 * Returns the registerable (root) domain, handling multi-part suffixes like co.uk.
 */
export function getRegisterableDomain(domain: string): string {
    let clean = domain.toLowerCase().trim();
    if (clean.startsWith('*.')) {
        clean = clean.slice(2);
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(clean)) {
        return clean;
    }
    const parts = clean.split('.');
    if (parts.length <= 2) return clean;
    
    const tld = parts[parts.length - 1]!;
    const sld = parts[parts.length - 2]!;
    
    const isCcTld = tld.length === 2;
    const isCommonSld = /^(co|com|org|net|gov|edu|ac|or|ne|ltd|plc|sch|asn)$/.test(sld);
    
    if (isCcTld && isCommonSld && parts.length >= 3) {
        return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
}
