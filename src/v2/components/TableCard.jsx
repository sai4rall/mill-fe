import { Card, Table } from '@mantine/core'

/** A card holding a table that scrolls sideways on small screens. */
export default function TableCard({ minWidth = 640, header, children, ...cardProps }) {
  return (
    <Card padding={0} {...cardProps}>
      {header}
      <Table.ScrollContainer minWidth={minWidth} type="native">
        <Table className="v2-table" striped={false}>{children}</Table>
      </Table.ScrollContainer>
    </Card>
  )
}
