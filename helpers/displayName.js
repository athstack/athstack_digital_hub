function formatDisplayName(firstName, lastName) {
  if (firstName && lastName) {
    return firstName + ' ' + lastName.charAt(0).toUpperCase() + '.';
  }
  return firstName || '';
}

module.exports = { formatDisplayName };
