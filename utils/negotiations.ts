import { localstorage } from '../utils/localStorage';

const NEGOTIATIONS_KEY = "offer_negotiations";

type NegotiationsMap = Record<string, string[]>;

export const getNegotiations = async (): Promise<NegotiationsMap> => {
    const raw = await localstorage.get(NEGOTIATIONS_KEY);
    return raw ? JSON.parse(raw) : {};
};

const saveNegotiations = async (data: NegotiationsMap) => {
    await localstorage.set(
        NEGOTIATIONS_KEY,
        JSON.stringify(data)
    );
};

export const addNegotiation = async (
    offerId: string,
    bidderId: string
) => {
    const negotiations = await getNegotiations();

    const bidders = negotiations[offerId] ?? [];

    if (!bidders.includes(bidderId)) {
        negotiations[offerId] = [...bidders, bidderId];
    }

    await saveNegotiations(negotiations);
};

/**
 * ❌ Remove ONE bidder (reject or cleanup)
 */
export const removeBidderFromNegotiation = async (
    offerId: string,
    bidderId: string
) => {
    const negotiations = await getNegotiations();

    if (!negotiations[offerId]) return;

    negotiations[offerId] = negotiations[offerId].filter(
        id => id !== bidderId
    );

    if (negotiations[offerId].length === 0) {
        delete negotiations[offerId];
    }

    await saveNegotiations(negotiations);
};

/**
 * 🧹 Remove whole offer when closed
 */
export const removeOfferNegotiation = async (offerId: string) => {
    const negotiations = await getNegotiations();

    if (!negotiations[offerId]) return;

    delete negotiations[offerId];

    await saveNegotiations(negotiations);
};
