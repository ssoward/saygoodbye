import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Toolbar,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CloudUpload as UploadIcon,
  Description as DocumentsIcon,
  Person as ProfileIcon,
  CreditCard as SubscriptionIcon,
  AdminPanelSettings as AdminIcon,
  Analytics as AnalyticsIcon,
  People as UsersIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const drawerWidth = 240;

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      show: true
    },
    {
      text: 'Upload Document',
      icon: <UploadIcon />,
      path: '/documents/upload',
      show: true
    },
    {
      text: 'My Documents',
      icon: <DocumentsIcon />,
      path: '/documents',
      show: true
    },
    {
      text: 'Profile',
      icon: <ProfileIcon />,
      path: '/profile',
      show: true
    },
    {
      text: 'Subscription',
      icon: <SubscriptionIcon />,
      path: '/subscription',
      show: true
    }
  ];

  const adminItems = [
    {
      text: 'Admin Dashboard',
      icon: <AdminIcon />,
      path: '/admin',
      show: user?.role === 'admin'
    },
    {
      text: 'User Management',
      icon: <UsersIcon />,
      path: '/admin/users',
      show: user?.role === 'admin'
    },
    {
      text: 'Analytics',
      icon: <AnalyticsIcon />,
      path: '/admin/analytics',
      show: user?.role === 'admin'
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const drawer = (
    <div>
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.filter(item => item.show).map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main + '20',
                    borderRight: `3px solid ${theme.palette.primary.main}`,
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.main,
                    },
                    '& .MuiListItemText-primary': {
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        {adminItems.some(item => item.show) && (
          <>
            <Divider sx={{ my: 1 }} />
            <List>
              {adminItems.filter(item => item.show).map((item) => (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                      '&.Mui-selected': {
                        backgroundColor: theme.palette.secondary.main + '20',
                        borderRight: `3px solid ${theme.palette.secondary.main}`,
                        '& .MuiListItemIcon-root': {
                          color: theme.palette.secondary.main,
                        },
                        '& .MuiListItemText-primary': {
                          color: theme.palette.secondary.main,
                          fontWeight: 600,
                        },
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.text} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Box>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
