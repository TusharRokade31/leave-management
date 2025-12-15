import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const getStatusIcon = (status: Leave['status']) => {
  switch (status) {
    case 'APPROVED':
      return <CheckCircle className="w-4 h-4" />;
    case 'REJECTED':
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

