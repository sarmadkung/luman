import { useState } from 'react';
import {
  Text,
  Button,
  IconButton,
  Badge,
  Surface,
  Panel,
  Section,
  Grid,
  Input,
  TextArea,
  Checkbox,
  Switch,
  Radio,
  RadioGroup,
  Select,
  Progress,
  ProgressBar,
  Spinner,
  Skeleton,
  Tooltip,
  Popover,
  Dialog,
  ConfirmationDialog,
  PermissionDialog,
  LoadingOverlay,
  Alert,
  Banner,
  EmptyState,
  ErrorState,
  LoadingState,
  StateView,
  StatCard,
  DashboardCard,
  RecommendationCard,
  QuickActionButton,
  Glass,
  Icon,
  useToast,
  type ThemeMode,
} from '@luman/ui';
import { Star, Trash2, Search, Download, Bell } from 'lucide-react';
import { useThemeStore } from '../theme';
import './PlaygroundPage.css';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function Row({ children }: { children: React.ReactNode }) {
  return <div className="lm-pg__row">{children}</div>;
}

/**
 * Design Playground (Epic 14): the visual testing surface. Renders every
 * component, variant, and state, with a live theme switcher. No business logic.
 */
export function PlaygroundPage() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const toast = useToast();

  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);
  const [radio, setRadio] = useState('a');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [overlay, setOverlay] = useState(false);

  return (
    <div className="lm-pg">
      <div className="lm-pg__head">
        <div>
          <Text variant="large-title">Design Playground</Text>
          <Text variant="body" tone="secondary">
            Every component, variant, state, and theme in one place.
          </Text>
        </div>
        <Select
          label="Theme"
          value={mode}
          options={THEME_OPTIONS}
          onChange={(e) => setMode(e.target.value as ThemeMode)}
        />
      </div>

      <Section title="Typography">
        <div className="lm-pg__stack">
          <Text variant="large-title">Large Title</Text>
          <Text variant="title">Title</Text>
          <Text variant="headline">Headline</Text>
          <Text variant="body">Body — the quick brown fox jumps over the lazy dog.</Text>
          <Text variant="caption">Caption — supporting detail</Text>
          <Text variant="metric">128 GB</Text>
        </div>
      </Section>

      <Section title="Buttons">
        <Row>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </Row>
        <Row>
          <IconButton icon={Star} label="Star" />
          <IconButton icon={Download} label="Download" variant="solid" />
          <IconButton icon={Trash2} label="Delete" variant="danger" />
          <Tooltip content="Search (⌘F)">
            <IconButton icon={Search} label="Search" />
          </Tooltip>
        </Row>
      </Section>

      <Section title="Badges">
        <Row>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="success">Success</Badge>
          <Badge tone="warning">Warning</Badge>
          <Badge tone="danger">Danger</Badge>
          <Badge tone="info">Info</Badge>
        </Row>
      </Section>

      <Section title="Form controls">
        <Grid columns={2} gap={4}>
          <Input label="Text input" placeholder="Type here…" />
          <Input label="With error" defaultValue="oops" error="This field is required" />
          <TextArea label="Text area" placeholder="Multiple lines…" />
          <Select
            label="Select"
            options={[
              { value: '1', label: 'Option one' },
              { value: '2', label: 'Option two' },
            ]}
          />
          <div className="lm-pg__stack">
            <Checkbox
              label="Checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <Switch label="Switch" checked={on} onChange={setOn} />
          </div>
          <RadioGroup label="Radio group" value={radio} onChange={setRadio}>
            <Radio value="a" label="Choice A" />
            <Radio value="b" label="Choice B" />
            <Radio value="c" label="Choice C" />
          </RadioGroup>
        </Grid>
      </Section>

      <Section title="Progress & loading">
        <div className="lm-pg__stack">
          <Progress value={0.35} label="35 percent" />
          <ProgressBar
            segments={[
              { fraction: 0.5, tone: 'accent' },
              { fraction: 0.2, tone: 'warning' },
              { fraction: 0.3, tone: 'muted' },
            ]}
            ariaLabel="Segmented"
          />
          <Row>
            <Spinner />
            <Skeleton width={160} />
            <Skeleton width={80} height={32} />
          </Row>
        </div>
      </Section>

      <Section title="States">
        <Grid columns={3} gap={4}>
          <Panel title="Loading">
            <LoadingState label="Loading…" compact />
          </Panel>
          <Panel title="Empty">
            <EmptyState title="Nothing here" description="Add something to get started." />
          </Panel>
          <Panel title="Error">
            <ErrorState description="Could not load this section." onRetry={() => {}} />
          </Panel>
          <Panel title="Permission">
            <StateView status="permission" />
          </Panel>
        </Grid>
      </Section>

      <Section title="Feedback">
        <div className="lm-pg__stack">
          <Alert tone="info" title="Heads up">
            This is an informational alert.
          </Alert>
          <Alert tone="success">Saved successfully.</Alert>
          <Alert tone="warning">This action needs your attention.</Alert>
          <Alert tone="danger" title="Error">
            Something went wrong.
          </Alert>
          <Banner tone="accent" action={<Button variant="primary">Action</Button>}>
            A prominent banner message.
          </Banner>
          <Row>
            <Button
              variant="secondary"
              onClick={() =>
                toast.show({
                  title: 'Toast fired',
                  description: 'This auto-dismisses.',
                  tone: 'success',
                })
              }
            >
              <Icon icon={Bell} size="sm" /> Show toast
            </Button>
            <Button variant="secondary" onClick={() => setDialogOpen(true)}>
              Open dialog
            </Button>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
              Confirmation
            </Button>
            <Button variant="secondary" onClick={() => setPermissionOpen(true)}>
              Permission
            </Button>
            <Button variant="secondary" onClick={() => setOverlay((v) => !v)}>
              Toggle overlay
            </Button>
            <Popover
              trigger={(p) => (
                <Button variant="secondary" {...p}>
                  Open popover
                </Button>
              )}
            >
              <div className="lm-pg__stack">
                <Text variant="body">Popover content</Text>
                <Button variant="ghost">An action</Button>
              </div>
            </Popover>
          </Row>
        </div>
      </Section>

      <Section title="Surfaces & cards">
        <Grid columns={3} gap={4}>
          <StatCard label="Total" value="460 GB" />
          <StatCard label="Used" value="331 GB" tone="accent" />
          <StatCard label="Free" value="128 GB" tone="success" />
        </Grid>
        <div className="lm-pg__stack">
          <DashboardCard
            title="Dashboard card"
            subtitle="With header and actions"
            actions={<Button variant="ghost">Action</Button>}
          >
            <Text variant="body" tone="secondary">
              Opaque content surface — never glass.
            </Text>
          </DashboardCard>
          <RecommendationCard
            icon="⚠"
            title="Clear developer caches"
            description="Safe to rebuild on demand."
            estimatedRecovery="21 GB"
            priority="high"
            onAction={() => {}}
          />
          <Grid columns={4} gap={3}>
            <QuickActionButton icon="◎" label="Smart Scan" description="Analyze" />
            <QuickActionButton icon="◔" label="Space Lens" description="Visualize" />
            <QuickActionButton icon="⬒" label="Large Files" description="Find big" />
            <QuickActionButton icon="⚙" label="Settings" description="Preferences" />
          </Grid>
          <Surface elevation="raised" padded>
            <Text variant="body">Surface — raised elevation</Text>
          </Surface>
        </div>
      </Section>

      <Section title="Glass (allowed surfaces only)">
        <Glass className="lm-pg__glass">
          <Text variant="body">Frosted glass — sidebar, toolbar, dialog, popover, toast only.</Text>
        </Glass>
      </Section>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Example dialog"
        description="Dialogs render on a frosted-glass panel and trap focus."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <Text variant="body" tone="secondary">
          Press Escape or click outside to dismiss.
        </Text>
      </Dialog>

      <ConfirmationDialog
        open={confirmOpen}
        title="Delete 3 items?"
        message="This is a preview — nothing is actually deleted in the playground."
        destructive
        confirmLabel="Delete"
        onConfirm={() => setConfirmOpen(false)}
        onCancel={() => setConfirmOpen(false)}
      />

      <PermissionDialog
        open={permissionOpen}
        message="Luman needs permission to read this folder to continue."
        onGrant={() => setPermissionOpen(false)}
        onDeny={() => setPermissionOpen(false)}
      />

      <div className="lm-pg__overlayhost">
        <LoadingOverlay visible={overlay} label="Working…" />
      </div>
    </div>
  );
}
