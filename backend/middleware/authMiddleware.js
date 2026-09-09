/**
 * Role-Based Access Control (RBAC) & Authentication Middleware
 *
 * Enforces backend authorization. Never trusts roles submitted in the request body
 * or unauthenticated client headers.
 */

// Server-side verified credentials registry
const AUTHORIZED_ACCOUNTS = {
  'auth-token-kmc-officer-2026': {
    id: 'usr_kmc_01',
    username: 'kmc_officer',
    name: 'Dr. Sneha Rao',
    role: 'AUTHORITY_OFFICER',
    designation: 'Senior Vigilance Officer',
    authorityCode: 'KMC_COUNCIL',
    authorityName: 'Karnataka Medical Council (KMC)',
    state: 'Karnataka',
  },
  'auth-token-dmc-officer-2026': {
    id: 'usr_dmc_01',
    username: 'dmc_officer',
    name: 'Dr. Rajesh Verma',
    role: 'AUTHORITY_OFFICER',
    designation: 'Chief Enforcement Officer',
    authorityCode: 'DMC_COUNCIL',
    authorityName: 'Delhi Medical Council (DMC)',
    state: 'Delhi',
  },
  'auth-token-blr-dha-2026': {
    id: 'usr_blr_dha_01',
    username: 'blr_dha_officer',
    name: 'Dr. Anand Kumar',
    role: 'AUTHORITY_OFFICER',
    designation: 'District Health Vigilance Officer',
    authorityCode: 'BLR_URBAN_DHA',
    authorityName: 'Bengaluru Urban District Health Authority',
    state: 'Karnataka',
  },
  'auth-token-kpme-2026': {
    id: 'usr_kpme_01',
    username: 'kpme_officer',
    name: 'Smt. Kavitha N.',
    role: 'AUTHORITY_OFFICER',
    designation: 'Establishment Compliance Officer',
    authorityCode: 'KPME_AUTHORITY',
    authorityName: 'Karnataka Private Medical Establishments Authority',
    state: 'Karnataka',
  },
  'auth-token-admin-healthsafe-2026': {
    id: 'usr_admin_01',
    username: 'admin',
    name: 'System Security Administrator',
    role: 'ADMIN',
    designation: 'Central Registry & Jurisdiction Rules Administrator',
    authorityCode: '*',
    authorityName: 'Health-Safe National Administration',
    state: 'All',
  },
  'auth-token-citizen-public': {
    id: 'usr_citizen_01',
    username: 'citizen_public',
    name: 'Citizen Reporter',
    role: 'CITIZEN',
    designation: 'Public Reporter',
    authorityCode: null,
    authorityName: 'Public Citizen',
    state: 'All',
  },
};

/**
 * Extracts and verifies token from request headers
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const customHeader = req.headers['x-auth-token'];

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (customHeader) {
    token = customHeader.trim();
  }

  if (token && AUTHORIZED_ACCOUNTS[token]) {
    req.user = { ...AUTHORIZED_ACCOUNTS[token] };
  } else {
    req.user = null; // Unauthenticated (Citizen)
  }

  next();
}

/**
 * Enforces that the request must come from an authenticated user with one of the allowed roles.
 *
 * @param {string[]} allowedRoles Array of required roles (e.g. ['AUTHORITY_OFFICER', 'ADMIN'])
 */
function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or invalid authorization token.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access forbidden: Insufficient permissions. Required role: ${allowedRoles.join(
          ' or '
        )}, but caller identity is ${req.user.role}.`,
      });
    }

    next();
  };
}

module.exports = {
  AUTHORIZED_ACCOUNTS,
  authenticateToken,
  requireRole,
};
