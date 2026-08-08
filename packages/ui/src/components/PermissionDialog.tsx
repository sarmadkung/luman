import { Dialog } from './Dialog';
import { Button } from './Button';

export interface PermissionDialogProps {
  readonly open: boolean;
  readonly title?: string;
  readonly message: string;
  readonly grantLabel?: string;
  readonly denyLabel?: string;
  readonly onGrant: () => void;
  readonly onDeny: () => void;
}

/** Requests access to a protected location. Grant is always an explicit action. */
export function PermissionDialog({
  open,
  title = 'Permission required',
  message,
  grantLabel = 'Grant access',
  denyLabel = 'Not now',
  onGrant,
  onDeny,
}: PermissionDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onDeny}
      title={title}
      description={message}
      footer={
        <>
          <Button variant="ghost" onClick={onDeny}>
            {denyLabel}
          </Button>
          <Button variant="primary" onClick={onGrant}>
            {grantLabel}
          </Button>
        </>
      }
    />
  );
}
