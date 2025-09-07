# Batch Evaluation Testing Guide

This guide explains how to test the `batch_evaluate_answers` endpoint in the HireIQ system.

## Overview

The `batch_evaluate_answers` endpoint allows you to evaluate multiple question-answer pairs for a candidate in a single API call. This is useful for testing the evaluation system or processing multiple interview responses at once.

## Endpoint Details

- **URL**: `POST /api/candidates/batch-evaluate/`
- **Authentication**: No authentication required
- **Content-Type**: `application/json`

## Request Format

```json
{
  "candidate_id": "CAND-123456",
  "evaluations": [
    {
      "question": "Your interview question here",
      "answer": "Candidate's answer here"
    },
    {
      "question": "Another question",
      "answer": "Another answer"
    }
  ]
}
```

### Required Fields

- `candidate_id` (string): The ID of the candidate whose answers are being evaluated
- `evaluations` (array): List of question-answer pairs to evaluate

### Each evaluation object must contain:
- `question` (string): The interview question asked
- `answer` (string): The candidate's response to the question

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "candidate_id": "CAND-123456",
  "results": [
    {
      "index": 0,
      "question": "Your interview question here...",
      "evaluation": {
        "overall_score": 8.5,
        "detailed_scores": {
          "technical_accuracy": 9,
          "relevance_to_question": 8,
          "depth_of_understanding": 8,
          "resume_alignment": 9,
          "communication_clarity": 8,
          "problem_solving_approach": 7
        },
        "feedback": "Detailed feedback about the answer...",
        "strengths": "Key strengths identified...",
        "areas_for_improvement": "Areas where candidate can improve...",
        "resume_insights": "How answer aligns with resume..."
      }
    }
  ],
  "summary": {
    "total_questions": 8,
    "successful_evaluations": 7,
    "failed_evaluations": 1,
    "average_score": 7.2,
    "overall_rating": "Good"
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Candidate ID is required"
}
```

#### 404 Not Found
```json
{
  "error": "Resume not found for this candidate"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Server error: detailed error message"
}
```

## Test Files Provided

### 1. `test_batch_evaluation_input.json`
- Comprehensive test with 8 different types of interview questions
- Covers technical, behavioral, and experience-based questions
- Good for testing the full range of evaluation capabilities

### 2. `test_batch_evaluation_simple.json`
- Simple test with 3 questions
- Faster to process and good for quick testing
- Covers basic technical questions

### 3. `test_batch_evaluation.py`
- Python script to test the endpoint
- Automatically loads test data and sends requests
- Provides detailed output and error handling

## How to Test

### Prerequisites

1. **Backend Running**: Make sure the Django backend is running:
   ```bash
   cd backend
   python manage.py runserver
   ```

2. **Valid Candidate**: Ensure you have a candidate with:
   - Valid candidate ID
   - Uploaded resume (PDF format)
   - The candidate must be active

3. **API Keys**: Make sure your `.env` file contains:
   ```
   GEMINI_API_KEY=your_actual_gemini_api_key
   ```

### Method 1: Using the Python Test Script

```bash
cd backend
python test_batch_evaluation.py [candidate_id]
```

If you don't provide a candidate_id, it will use the one in the JSON file (`CAND-123456`).

### Method 2: Using curl

```bash
curl -X POST http://localhost:8000/api/candidates/batch-evaluate/ \
     -H "Content-Type: application/json" \
     -d @test_batch_evaluation_simple.json
```

### Method 3: Using Postman

1. Create a new POST request to `http://localhost:8000/api/candidates/batch-evaluate/`
2. Set header: `Content-Type: application/json`
3. Copy the content from one of the JSON test files into the request body
4. Update the `candidate_id` to match a real candidate in your system
5. Send the request

### Method 4: Using Python requests

```python
import json
import requests

# Load test data
with open('test_batch_evaluation_simple.json', 'r') as f:
    test_data = json.load(f)

# Update candidate ID if needed
test_data['candidate_id'] = 'your_actual_candidate_id'

# Send request
response = requests.post(
    'http://localhost:8000/api/candidates/batch-evaluate/',
    json=test_data,
    headers={'Content-Type': 'application/json'}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")
```

## Customizing Test Data

### Updating Candidate ID

Before testing, you'll need to update the `candidate_id` in the JSON files to match a real candidate in your system. You can:

1. Create a new candidate through the frontend
2. Upload a resume for that candidate
3. Use the candidate's ID in your test data

### Adding More Questions

You can add more question-answer pairs to the `evaluations` array:

```json
{
  "question": "Your new question",
  "answer": "Expected answer for testing"
}
```

### Question Types to Test

Consider including these types of questions in your tests:

1. **Technical Questions**: Programming concepts, algorithms, system design
2. **Behavioral Questions**: Past experiences, problem-solving scenarios
3. **Experience Questions**: Previous projects, technologies used
4. **Problem-Solving**: How they approach challenges
5. **Communication**: How they explain complex topics

## Expected Evaluation Scores

The evaluation system scores answers on a scale of 1-10 across multiple criteria:

- **9-10**: Exceptional - Expert-level knowledge and perfect alignment
- **7-8**: Good - Solid understanding with minor gaps
- **5-6**: Average - Basic understanding but lacks depth
- **3-4**: Below Average - Limited understanding with significant gaps
- **1-2**: Poor - Incorrect or irrelevant response

## Troubleshooting

### Common Issues

1. **"Resume not found"**: Make sure the candidate has uploaded a PDF resume
2. **"Invalid candidate ID"**: Verify the candidate exists and is active
3. **API timeout**: Reduce the number of questions for testing
4. **Evaluation fails**: Check that GEMINI_API_KEY is properly configured
5. **Connection refused**: Ensure Django backend is running on the correct port

### Debug Tips

1. Check Django console for detailed error messages
2. Verify candidate exists: `GET /api/candidates/validate-candidate-id/`
3. Test single evaluation first: `POST /api/candidates/evaluate-answer/`
4. Check API key configuration in Django admin or `.env` file

## Performance Considerations

- Batch evaluation processes questions sequentially
- Large batches (>10 questions) may take several minutes
- Each evaluation makes an API call to Gemini AI
- Consider rate limits of the Gemini API
- For production, implement proper error handling and retries

## Security Notes

- This endpoint doesn't require authentication (for testing purposes)
- In production, consider adding authentication
- Validate and sanitize all input data
- Monitor API usage to prevent abuse
- Implement rate limiting for production use
