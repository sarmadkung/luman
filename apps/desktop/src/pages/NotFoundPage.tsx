import { useNavigate } from 'react-router-dom';
import { Button, EmptyState } from '@luman/ui';
import { Page } from '../components/common';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Page title="Not found">
      <EmptyState
        title="This page doesn’t exist"
        description="The page you were looking for could not be found."
        action={
          <Button variant="primary" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>
        }
      />
    </Page>
  );
}
