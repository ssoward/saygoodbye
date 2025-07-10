import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  IconButton,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudUpload as UploadIcon,
  Description as DocumentsIcon,
  Analytics as AnalyticsIcon,
  Person as ProfileIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const onboardingSteps = [
  {
    title: 'Welcome to Say Goodbye',
    description: 'Your comprehensive POA document validation platform',
    content: (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography variant="h4" gutterBottom color="primary">
          Welcome to Say Goodbye! 🎉
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          We're excited to help you validate Power of Attorney documents with ease and confidence. 
          Let's take a quick tour to get you started.
        </Typography>
        <Alert severity="info">
          This tour will help you understand the key features and how to make the most of your account.
        </Alert>
      </Box>
    )
  },
  {
    title: 'Upload Documents',
    description: 'Learn how to upload and validate POA documents',
    content: (
      <Box sx={{ py: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <UploadIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Document Upload
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Upload your POA documents using our simple drag-and-drop interface. We support PDF files up to 10MB.
            </Typography>
            <Typography variant="body2">
              • Drag and drop PDF files
              • Add case IDs for organization
              • Include notes for context
              • Batch upload (Professional+ plans)
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  What we validate:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon color="success" sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">Notary acknowledgment</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon color="success" sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">Witness signatures</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon color="success" sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">Required verbiage</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon color="success" sx={{ mr: 1, fontSize: 16 }} />
                    <Typography variant="body2">California compliance</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    )
  },
  {
    title: 'Review Results',
    description: 'Understand validation results and reports',
    content: (
      <Box sx={{ py: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <DocumentsIcon sx={{ fontSize: 80, color: 'secondary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Validation Results
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              After processing, you'll receive detailed validation results with comprehensive reports.
            </Typography>
            <Typography variant="body2">
              • Pass/Fail status for each requirement
              • Detailed explanations of issues
              • Confidence scores
              • Downloadable PDF reports
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Result Types:
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.50', borderRadius: 1 }}>
                      <CheckIcon color="success" />
                      <Typography variant="caption" display="block">PASSED</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'error.50', borderRadius: 1 }}>
                      <CloseIcon color="error" />
                      <Typography variant="caption" display="block">FAILED</Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    )
  },
  {
    title: 'Manage Your Account',
    description: 'Profile settings and subscription management',
    content: (
      <Box sx={{ py: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <ProfileIcon sx={{ fontSize: 80, color: 'info.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Account Management
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Keep your profile updated and manage your subscription to make the most of Say Goodbye.
            </Typography>
            <Typography variant="body2">
              • Update personal information
              • Manage subscription plans
              • View usage statistics
              • Download billing history
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <AnalyticsIcon sx={{ fontSize: 80, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Track Your Usage
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Monitor your validation usage and document history from your dashboard.
            </Typography>
            <Typography variant="body2">
              • Monthly usage tracking
              • Document history
              • Success rate analytics
              • Export capabilities
            </Typography>
          </Grid>
        </Grid>
      </Box>
    )
  },
  {
    title: 'You\'re All Set!',
    description: 'Ready to start validating documents',
    content: (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom color="success.main">
          You're Ready to Go!
        </Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          You now know the basics of using Say Goodbye. Start by uploading your first POA document 
          to see our validation system in action.
        </Typography>
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Pro Tip:</strong> You can always revisit this tour from the help menu in your profile.
          </Typography>
        </Alert>
        <Typography variant="body2" color="text.secondary">
          If you need help at any time, check out our documentation or contact our support team.
        </Typography>
      </Box>
    )
  }
];

const OnboardingTour = ({ onComplete, onSkip }) => {
  const { completeOnboarding } = useAuth();
  const { showSuccess } = useNotification();
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      await completeOnboarding();
      showSuccess('Welcome to Say Goodbye! Your account setup is complete.');
      setOpen(false);
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // Continue anyway
      setOpen(false);
      onComplete();
    }
  };

  const handleSkip = () => {
    setOpen(false);
    onSkip();
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '60vh' }
      }}
    >
      <Box sx={{ position: 'relative', p: 2 }}>
        <IconButton
          onClick={handleSkip}
          sx={{ position: 'absolute', top: 8, right: 8 }}
        >
          <CloseIcon />
        </IconButton>

        {/* Stepper */}
        <Stepper activeStep={currentStep} sx={{ mb: 3 }}>
          {onboardingSteps.map((step, index) => (
            <Step key={index}>
              <StepLabel>{step.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <DialogContent sx={{ px: 0 }}>
          <Typography variant="h6" gutterBottom>
            {currentStepData.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {currentStepData.description}
          </Typography>
          
          {currentStepData.content}
        </DialogContent>

        <DialogActions sx={{ px: 0, pt: 2 }}>
          <Button onClick={handleSkip} color="inherit">
            Skip Tour
          </Button>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {currentStep > 0 && (
            <Button onClick={handleBack}>
              Back
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            variant="contained"
          >
            {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default OnboardingTour;
