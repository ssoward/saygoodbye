import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Divider,
  Alert,
  InputAdornment,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const validationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .required('Password is required')
});

const testUsers = [
  {
    name: 'Regular User',
    email: 'user@demo.com',
    password: 'demopass123',
    role: 'user',
    tier: 'FREE',
    icon: <PersonIcon />,
    description: 'Basic user account'
  },
  {
    name: 'Professional User',
    email: 'pro@demo.com',
    password: 'demo1234',
    role: 'user',
    tier: 'PROFESSIONAL',
    icon: <BusinessIcon />,
    description: 'Professional tier features'
  },
  {
    name: 'Admin User',
    email: 'admin@demo.com',
    password: 'demopass123',
    role: 'admin',
    tier: 'ADMIN',
    icon: <AdminIcon />,
    description: 'Full admin access'
  }
];

const Login = () => {
  const { login, error, clearError } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [showPassword, setShowPassword] = useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: ''
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      clearError();
      const result = await login(values.email, values.password);
      
      if (result.success) {
        showSuccess('Login successful!');
      } else {
        showError(result.error || 'Login failed');
      }
      
      setSubmitting(false);
    }
  });

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleTestUserLogin = (testUser) => {
    formik.setValues({
      email: testUser.email,
      password: testUser.password
    });
  };

  const getTierColor = (tier) => {
    switch (tier.toLowerCase()) {
      case 'free': return 'default';
      case 'professional': return 'primary';
      case 'admin': return 'secondary';
      case 'enterprise': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2
      }}
    >
      <Paper
        elevation={24}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          borderRadius: 2
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom fontWeight={600}>
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to {process.env.REACT_APP_APP_NAME}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth
            id="email"
            name="email"
            label="Email Address"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              ),
            }}
            autoComplete="email"
            autoFocus
          />

          <TextField
            fullWidth
            id="password"
            name="password"
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            margin="normal"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePassword}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            autoComplete="current-password"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={formik.isSubmitting}
            sx={{ mt: 3, mb: 2, py: 1.5 }}
          >
            {formik.isSubmitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            OR
          </Typography>
        </Divider>

        {/* Test Users Section */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ textAlign: 'center' }}>
            Quick Test Login
          </Typography>
          <Grid container spacing={1}>
            {testUsers.map((testUser) => (
              <Grid item xs={12} key={testUser.email}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => handleTestUserLogin(testUser)}
                >
                  <CardContent sx={{ py: 1, px: 2, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {testUser.icon}
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {testUser.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {testUser.description}
                        </Typography>
                      </Box>
                      <Chip
                        label={testUser.tier.toUpperCase()}
                        color={getTierColor(testUser.tier)}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            Click any test user to auto-fill login credentials
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Sign up here
            </Link>
          </Typography>
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
