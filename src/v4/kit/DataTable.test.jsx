import { describe, it, expect, afterEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import DataTable from './DataTable'
import { asPhone, renderV4 } from '../test/render'

const rows = [{ id: 1, name: 'Ravi', qty: 12 }, { id: 2, name: 'Sita', qty: 7 }]
const columns = [{ key: 'name', header: 'Farmer' }, { key: 'qty', header: 'Quantity' }, { key: 'act', header: '', cell: (r) => <button>Pay {r.name}</button> }]

let restore
afterEach(() => restore?.())

describe('v4 DataTable', () => {
  it('renders a table on larger screens', () => {
    renderV4(<DataTable label="Purchases" rows={rows} columns={columns} />)
    expect(screen.getByRole('grid', { name: 'Purchases' })).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3)
  })

  it('renders one card per row on phones, with labels and actions', () => {
    restore = asPhone()
    renderV4(<DataTable label="Purchases" rows={rows} columns={columns} />)
    expect(screen.queryByRole('grid')).toBeNull()
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('Ravi')).toBeInTheDocument()
    expect(within(cards[0]).getByText('Quantity')).toBeInTheDocument()
    expect(within(cards[0]).getByRole('button', { name: 'Pay Ravi' })).toBeInTheDocument()
  })
})
