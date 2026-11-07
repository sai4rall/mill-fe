// Who paddy is bought from. Matches backend Farmer.PartyType. Kept as a list so reports can group by it later.
export const PARTY_TYPES = [
  { value: 'FARMER', label: 'Farmer', plural: 'Farmers' },
  { value: 'AGENT', label: 'Agent', plural: 'Agents' },
  { value: 'SUPPLIER', label: 'Supplier', plural: 'Suppliers' },
]

/** "Farmer" / "Agent" / "Supplier" (records without a type are farmers). */
export const partyTypeLabel = (type) => (PARTY_TYPES.find(t => t.value === type) || PARTY_TYPES[0]).label
