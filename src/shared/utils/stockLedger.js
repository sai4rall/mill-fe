// Stock ledger lines shared by the Stock Report and the super admin mill stock page.
export function ledgerRows(stock) {
  return [
    { label: 'Total Paddy Purchased', value: stock?.totalPaddyPurchased, desc: 'Cumulative paddy bought from all farmers' },
    { label: 'Paddy Used in Batches', value: Number(stock?.totalPaddyPurchased || 0) - Number(stock?.paddyOnHand || 0), desc: 'Paddy sent to mill (completed + in progress)' },
    { label: 'Paddy on Hand', value: stock?.paddyOnHand, desc: 'Purchased paddy not yet sent to the mill', bold: true },
    { label: 'Paddy Currently in Mill', value: stock?.paddyInMill, desc: 'In in-progress batches' },
    { label: 'Total Rice Produced', value: stock?.totalRiceProduced, desc: 'From completed mill batches' },
    { label: 'Total Rice Exported', value: stock?.totalRiceExported, desc: 'Total shipped to customers' },
    { label: 'Rice on Hand', value: stock?.riceOnHand, desc: 'Produced − exported', bold: true },
  ]
}
