import React from 'react';
import { useFeedbackStore } from '../store/feedbackStore';
import ActionFeedback from './ActionFeedback';

const GlobalFeedbackManager: React.FC = () => {
  const { feedbacks, hideFeedback } = useFeedbackStore();

  return (
    <>
      {feedbacks.map(feedback => (
        <ActionFeedback
          key={feedback.id}
          type={feedback.type}
          message={feedback.message}
          isVisible={true}
          duration={0} // 由store管理自动移除
          position={feedback.position}
          onClose={() => hideFeedback(feedback.id)}
        />
      ))}
    </>
  );
};

export default GlobalFeedbackManager;