# Recruiter Dashboard Evaluation Scoring System

This document explains how the evaluation scoring system works in the HireIQ recruiter dashboard.

## Overview

The recruiter dashboard now displays overall scores and average ratings for candidates who have completed their interviews. The system automatically evaluates candidate responses using AI and presents the results in an easy-to-understand format.

## How It Works

### 1. Candidate Interview Process
- Candidate uploads resume
- Candidate completes audio interview (answers questions)
- Audio responses are transcribed and stored

### 2. Evaluation Process
- When recruiter views the dashboard, the system checks for candidates with completed interviews
- For candidates without evaluation scores, the system can automatically fetch evaluations
- The evaluation process analyzes each question-answer pair using AI
- Results are aggregated into an overall score and rating

### 3. Score Display
- **Score**: Displayed as X/100 (converted from the 1-10 scale)
- **Rating**: Shows "Excellent", "Good", "Average", or "Needs Improvement"
- **Color Coding**: 
  - Green: 80-100 (Excellent)
  - Yellow: 60-79 (Good) 
  - Red: Below 60 (Needs Improvement)

## API Endpoints

### Fetch Candidate Evaluation
```
POST /api/candidates/fetch-evaluation/
Content-Type: application/json

{
  "candidate_id": "candidate-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "candidate_id": "candidate-uuid",
  "evaluation_summary": {
    "total_questions": 5,
    "successful_evaluations": 5,
    "failed_evaluations": 0,
    "average_score": 7.8,
    "overall_rating": "Good"
  },
  "candidate": {
    "id": "...",
    "email": "candidate@example.com",
    "interview_score": 78,
    "evaluation_score": "7.8",
    "evaluation_rating": "Good",
    ...
  }
}
```

### Batch Evaluation (Alternative)
```
POST /api/candidates/batch-evaluate/
Content-Type: application/json

{
  "candidate_id": "candidate-uuid",
  "evaluations": [
    {
      "question": "Question text...",
      "answer": "Candidate's answer..."
    }
  ]
}
```

## Database Schema

### New Candidate Model Fields
```python
class Candidate(Document):
    # ... existing fields ...
    
    # Evaluation results
    evaluation_score = StringField(max_length=10)  # Overall score (e.g., "8.5")
    evaluation_rating = StringField(max_length=50)  # Overall rating 
    evaluation_data = DictField()  # Store complete evaluation results
    evaluation_timestamp = DateTimeField()  # When evaluation was completed
```

## Frontend Features

### Recruiter Dashboard Enhancements

1. **Score Column**: Shows both numerical score and rating
2. **Auto-Evaluation**: Automatically fetches scores for completed interviews
3. **Manual Refresh**: "Get Score" and "Refresh" buttons for manual updates
4. **Batch Update**: "Update Scores" button to refresh all candidates

### Button States
- **"Get Score"**: For candidates with completed interviews but no score
- **"Refresh"**: For candidates with existing scores (to update)
- **"Evaluate"**: Alternative text for the evaluation action

## Testing

### Test the Evaluation Workflow
```bash
cd backend
python test_evaluation_workflow.py <candidate_id>
```

### Test Batch Evaluation
```bash
cd backend
python test_batch_evaluation.py <candidate_id>
```

## Configuration Requirements

### Environment Variables
```env
GROQ_API_KEY=your_groq_api_key_here
PERPLEXITY_API_KEY=your_perplexity_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### MongoDB Configuration
- Ensure MongoDB connection is properly configured
- The system uses GridFS for resume storage and evaluation caching

## Usage Guide

### For Recruiters

1. **View Candidates**: Navigate to the recruiter dashboard
2. **Check Scores**: Candidates with completed interviews will show either:
   - Existing scores and ratings
   - "Get Score" button to fetch evaluation
3. **Update Scores**: 
   - Click "Get Score" for individual candidates
   - Click "Update Scores" to refresh all candidates
4. **Interpret Results**:
   - Green scores (80+): Excellent candidates
   - Yellow scores (60-79): Good candidates  
   - Red scores (<60): May need improvement

### Score Calculation

The evaluation system:
1. Analyzes each question-answer pair
2. Scores each answer on a 1-10 scale
3. Calculates the average across all questions
4. Converts to 100-point scale for display
5. Assigns rating based on score ranges

### Performance Considerations

- Evaluations are cached in the database
- First-time evaluation may take 30-60 seconds
- Subsequent views are instant (cached results)
- Batch operations handle multiple candidates efficiently

## Troubleshooting

### Common Issues

1. **"No interview responses found"**
   - Candidate hasn't completed the interview
   - Check if audio responses exist

2. **"Resume not found"**
   - Candidate hasn't uploaded resume
   - Resume upload is required for evaluation

3. **"Evaluation failed"**
   - Check API key configuration
   - Verify network connectivity
   - Check server logs for detailed errors

4. **Scores not appearing**
   - Click "Get Score" button manually
   - Check browser console for errors
   - Verify backend is running

### Debug Commands

```bash
# Check candidate data
python manage.py shell
>>> from candidates.models import Candidate
>>> candidate = Candidate.objects.get(candidate_id="your-id")
>>> print(candidate.audio_responses)
>>> print(candidate.evaluation_score)

# Test evaluation endpoint
curl -X POST http://localhost:8000/api/candidates/fetch-evaluation/ \
  -H "Content-Type: application/json" \
  -d '{"candidate_id": "your-candidate-id"}'
```

## Implementation Details

### Frontend (React/TypeScript)
- Automatic score fetching on dashboard load
- Real-time UI updates after evaluation
- Loading states and error handling
- Responsive design for score display

### Backend (Django/MongoDB)
- RESTful API for evaluation operations
- Efficient caching of evaluation results
- Error handling and validation
- Integration with existing interview system

### AI Integration
- Uses multiple AI services (Gemini, GROQ, Perplexity)
- Fallback mechanisms for service availability
- Comprehensive evaluation rubrics
- Resume-aware scoring for context

## Future Enhancements

- Detailed evaluation breakdowns
- Custom scoring rubrics
- Evaluation history tracking
- Performance analytics
- Export capabilities
