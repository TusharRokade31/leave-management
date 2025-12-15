export const getStatusColor = (status: Leave['status']): string => {
  switch(status) {
    case 'APPROVED': return 'text-green-600 bg-green-50';
    case 'REJECTED': return 'text-red-600 bg-red-50';
    default: return 'text-yellow-600 bg-yellow-50';
  }
};