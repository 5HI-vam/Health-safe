const { AUTHORIZED_ACCOUNTS } = require('../middleware/authMiddleware');

exports.login = (req, res) => {
  const { username, password, token: directToken } = req.body;

  // Direct token login
  if (directToken && AUTHORIZED_ACCOUNTS[directToken]) {
    const user = AUTHORIZED_ACCOUNTS[directToken];
    return res.json({
      success: true,
      token: directToken,
      user,
    });
  }

  // Username lookup
  const accountEntry = Object.entries(AUTHORIZED_ACCOUNTS).find(
    ([token, acc]) => acc.username.toLowerCase() === (username || '').toLowerCase()
  );

  if (!accountEntry) {
    return res.status(401).json({
      success: false,
      error: 'Invalid credentials. Please select or enter a valid authority officer / admin account.',
    });
  }

  const [token, user] = accountEntry;

  return res.json({
    success: true,
    token,
    user,
  });
};

exports.getMe = (req, res) => {
  if (!req.user) {
    return res.json({
      success: true,
      authenticated: false,
      role: 'CITIZEN',
      user: null,
    });
  }

  return res.json({
    success: true,
    authenticated: true,
    role: req.user.role,
    user: req.user,
  });
};

exports.getDemoAccounts = (req, res) => {
  const accounts = Object.entries(AUTHORIZED_ACCOUNTS).map(([token, acc]) => ({
    token,
    username: acc.username,
    name: acc.name,
    role: acc.role,
    designation: acc.designation,
    authorityCode: acc.authorityCode,
    authorityName: acc.authorityName,
    state: acc.state,
  }));

  return res.json({
    success: true,
    accounts,
  });
};
