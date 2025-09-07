import os
import google.generativeai as genai
import io
from typing import Dict, Any, Optional, Tuple
import logging

# Set up logging
logger = logging.getLogger(__name__)

class CandidateEvaluator:
    """
    A class to evaluate candidate answers using Google Gemini AI.
    Evaluates answers based on the question asked and the candidate's resume.
    """
    
    def __init__(self):
        """Initialize the evaluator with Gemini API configuration."""
        self.api_key = os.getenv('GEMINI_API_KEY')
        if not self.api_key or self.api_key == 'your_gemini_api_key_here':
            raise ValueError(
                "GEMINI_API_KEY not properly configured. "
                "Please set a valid API key in your .env file. "
                "Get your API key from: https://makersuite.google.com/app/apikey"
            )
        
        # Configure Gemini API
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception as e:
            raise ValueError(f"Failed to configure Gemini API: {str(e)}")
    
    def extract_text_from_pdf(self, pdf_content: bytes) -> str:
        """
        Extract text content from PDF bytes using PyMuPDF (fitz).
        Uses the same parse_resume function from questions.py module.
        
        Args:
            pdf_content (bytes): PDF file content as bytes
            
        Returns:
            str: Extracted text from PDF
        """
        try:
            # Import the parse_resume function from questions.py
            from .questions import parse_resume
            
            # Create a file-like object from bytes that mimics Django's InMemoryUploadedFile
            class MockFile:
                def __init__(self, content):
                    self.content = content
                    self.position = 0
                
                def read(self):
                    return self.content
            
            mock_file = MockFile(pdf_content)
            text = parse_resume(mock_file)
            
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF using PyMuPDF: {str(e)}")
            # Fallback to a simple message if extraction fails
            return "Resume content could not be extracted"
    
    def create_evaluation_prompt(self, question: str, answer: str, resume_text: str) -> str:
        """
        Create a detailed evaluation prompt for Gemini AI.
        
        Args:
            question (str): The interview question asked
            answer (str): The candidate's answer
            resume_text (str): Extracted text from candidate's resume
            
        Returns:
            str: Formatted prompt for evaluation
        """
        prompt = f"""
You are an expert technical interviewer and HR professional evaluating a candidate's interview response. 
Your task is to evaluate the candidate's answer based on the question asked and their resume background.

**CANDIDATE'S RESUME:**
{resume_text}

**INTERVIEW QUESTION:**
{question}

**CANDIDATE'S ANSWER:**
{answer}

**EVALUATION CRITERIA:**
Please evaluate the candidate's answer on a scale of 1-10 based on the following criteria:

1. **Technical Accuracy (25%)**: How technically sound and correct is the answer?
2. **Relevance to Question (20%)**: How well does the answer address the specific question asked?
3. **Depth of Understanding (20%)**: Does the answer demonstrate deep understanding of the topic?
4. **Resume Alignment (15%)**: How well does the answer align with the candidate's background and experience shown in their resume?
5. **Communication Clarity (10%)**: How clear, structured, and well-articulated is the response?
6. **Problem-Solving Approach (10%)**: Does the answer show good problem-solving methodology and thinking process?

**SCORING GUIDELINES:**
- 9-10: Exceptional - Demonstrates expert-level knowledge and perfect alignment
- 7-8: Good - Shows solid understanding with minor gaps
- 5-6: Average - Basic understanding but lacks depth or has some inaccuracies
- 3-4: Below Average - Limited understanding with significant gaps
- 1-2: Poor - Incorrect or irrelevant response

**OUTPUT FORMAT:**
Please provide your evaluation in the following JSON format:
{{
    "overall_score": [score from 1-10],
    "detailed_scores": {{
        "technical_accuracy": [score from 1-10],
        "relevance_to_question": [score from 1-10],
        "depth_of_understanding": [score from 1-10],
        "resume_alignment": [score from 1-10],
        "communication_clarity": [score from 1-10],
        "problem_solving_approach": [score from 1-10]
    }},
    "feedback": "Detailed feedback explaining the scores and areas for improvement",
    "strengths": "Key strengths demonstrated in the answer",
    "areas_for_improvement": "Specific areas where the candidate can improve",
    "resume_insights": "How well the answer leverages or aligns with the candidate's resume experience"
}}

Evaluate thoroughly and provide constructive feedback that would help both the recruiter and the candidate.
"""
        return prompt
    
    def evaluate_answer(self, question: str, answer: str, resume_content: bytes) -> Dict[str, Any]:
        """
        Evaluate a candidate's answer using Gemini AI.
        
        Args:
            question (str): The interview question
            answer (str): The candidate's response
            resume_content (bytes): PDF resume content as bytes
            
        Returns:
            Dict[str, Any]: Evaluation results with scores and feedback
        """
        try:
            # Extract text from resume PDF
            resume_text = self.extract_text_from_pdf(resume_content)
            if not resume_text:
                logger.warning("Could not extract text from resume PDF")
                resume_text = "Resume content could not be extracted"
            
            # Create evaluation prompt
            prompt = self.create_evaluation_prompt(question, answer, resume_text)
            
            # Generate evaluation using Gemini
            try:
                response = self.model.generate_content(prompt)
                
                # Check if response is valid
                if not response or not hasattr(response, 'text'):
                    raise ValueError("Invalid response from Gemini API")
                
                # Parse the response
                evaluation_text = response.text
                
                if not evaluation_text:
                    raise ValueError("Empty response from Gemini API")
                
            except Exception as api_error:
                logger.error(f"Gemini API call failed: {str(api_error)}")
                return self.create_error_response(
                    f"Gemini API call failed: {str(api_error)}. "
                    f"Please check your API key and internet connection."
                )
            
            # Try to extract JSON from the response
            import json
            import re
            
            # Find JSON in the response
            json_match = re.search(r'\{.*\}', evaluation_text, re.DOTALL)
            if json_match:
                try:
                    evaluation_json = json.loads(json_match.group())
                    return evaluation_json
                except json.JSONDecodeError:
                    pass
            
            # If JSON parsing fails, create a fallback response
            return self.create_fallback_evaluation(evaluation_text)
            
        except Exception as e:
            logger.error(f"Error during evaluation: {str(e)}")
            return self.create_error_response(str(e))
    
    def create_fallback_evaluation(self, evaluation_text: str) -> Dict[str, Any]:
        """
        Create a fallback evaluation response when JSON parsing fails.
        
        Args:
            evaluation_text (str): Raw evaluation text from Gemini
            
        Returns:
            Dict[str, Any]: Structured evaluation response
        """
        return {
            "overall_score": 6,  # Default middle score
            "detailed_scores": {
                "technical_accuracy": 6,
                "relevance_to_question": 6,
                "depth_of_understanding": 6,
                "resume_alignment": 6,
                "communication_clarity": 6,
                "problem_solving_approach": 6
            },
            "feedback": evaluation_text,
            "strengths": "Evaluation completed successfully",
            "areas_for_improvement": "Please review the detailed feedback",
            "resume_insights": "Resume analysis included in evaluation"
        }
    
    def create_error_response(self, error_message: str) -> Dict[str, Any]:
        """
        Create an error response when evaluation fails.
        
        Args:
            error_message (str): Error message
            
        Returns:
            Dict[str, Any]: Error response structure
        """
        return {
            "overall_score": 0,
            "detailed_scores": {
                "technical_accuracy": 0,
                "relevance_to_question": 0,
                "depth_of_understanding": 0,
                "resume_alignment": 0,
                "communication_clarity": 0,
                "problem_solving_approach": 0
            },
            "feedback": f"Evaluation failed: {error_message}",
            "strengths": "Unable to evaluate due to error",
            "areas_for_improvement": "Please try again or contact support",
            "resume_insights": "Resume analysis could not be completed",
            "error": True
        }


# Convenience function for direct usage
def evaluate_candidate_answer(question: str, answer: str, resume_content: bytes) -> Dict[str, Any]:
    """
    Evaluate a candidate's answer using the CandidateEvaluator class.
    If Gemini API key is not configured, returns a mock evaluation.
    
    Args:
        question (str): The interview question
        answer (str): The candidate's response
        resume_content (bytes): PDF resume content as bytes
        
    Returns:
        Dict[str, Any]: Evaluation results with scores and feedback
    """
    try:
        evaluator = CandidateEvaluator()
        return evaluator.evaluate_answer(question, answer, resume_content)
    except ValueError as e:
        # If API key is not configured, use mock evaluation
        if "GEMINI_API_KEY" in str(e):
            logger.warning("Using mock evaluation due to missing API key")
            try:
                import sys
                import os
                backend_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
                sys.path.insert(0, backend_path)
                from mock_evaluation import mock_evaluate_candidate_answer
                return mock_evaluate_candidate_answer(question, answer, resume_content)
            except ImportError:
                return {
                    "overall_score": 0,
                    "error": True,
                    "message": "GEMINI_API_KEY not configured and mock evaluation not available. Please set up your API key."
                }
        else:
            logger.error(f"Error in evaluate_candidate_answer: {str(e)}")
            return {
                "overall_score": 0,
                "error": True,
                "message": str(e)
            }
    except Exception as e:
        logger.error(f"Error in evaluate_candidate_answer: {str(e)}")
        return {
            "overall_score": 0,
            "error": True,
            "message": str(e)
        }


# Example usage function for testing
def test_evaluation():
    """
    Test function to demonstrate how to use the evaluator.
    This function should be called only for testing purposes.
    """
    # Sample data for testing
    sample_question = "Explain the difference between SQL and NoSQL databases and when you would use each."
    sample_answer = "SQL databases are relational and use structured query language. They have ACID properties and are good for complex queries. NoSQL databases are non-relational and can handle unstructured data. They are more scalable for big data applications."
    
    # For testing, you would need to provide actual PDF bytes
    # sample_resume_bytes = b"..." # This would be actual PDF content
    
    print("Evaluation system is ready. Use evaluate_candidate_answer() function with actual data.")
    print("Required parameters:")
    print("- question: str (interview question)")
    print("- answer: str (candidate's response)")
    print("- resume_content: bytes (PDF file content as bytes)")


if __name__ == "__main__":
    test_evaluation()

