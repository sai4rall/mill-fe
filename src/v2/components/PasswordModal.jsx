import { useState } from 'react'
import { ActionIcon, Alert, Button, Code, CopyButton, Group, Modal, Stack, Text, Tooltip } from '@mantine/core'
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react'

/** Shows a one-time generated password with copy and reveal. */
export default function PasswordModal({ opened, onClose, title = 'Password', username, password, message }) {
  const [visible, setVisible] = useState(false)
  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <Stack gap="md">
        {username && <Text size="sm">Username: <Code fz="sm">{username}</Code></Text>}
        <Alert color="yellow" variant="light" icon={<KeyRound size={18} />}>
          {message || 'Save this password now — it will not be shown again.'}
        </Alert>
        <Group gap="xs" wrap="nowrap" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: 8 }}>
          <Text ff="monospace" fw={600} style={{ flex: 1, letterSpacing: 1 }} aria-label="Generated password">
            {visible ? password : '•'.repeat(password?.length || 0)}
          </Text>
          <Tooltip label={visible ? 'Hide' : 'Show'}>
            <ActionIcon variant="subtle" color="gray" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </ActionIcon>
          </Tooltip>
          <CopyButton value={password || ''}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'}>
                <ActionIcon variant="light" color={copied ? 'leaf' : 'gray'} onClick={copy} aria-label="Copy password">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        <Button onClick={onClose} fullWidth>Done</Button>
      </Stack>
    </Modal>
  )
}
