"""
Mock evaluation function for testing without Gemini API key
"""

def mock_evaluate_candidate_answer(question: str, answer: str, resume_content: bytes) -> dict:
    """
    Mock evaluation function that returns a sample evaluation.
    Use this for testing when Gemini API key is not configured.
    """
    
    # Simple scoring based on answer length and keywords
    answer_length = len(answer.strip())
    question_length = len(question.strip())
    
    # Basic scoring logic
    if answer_length < 20:
        base_score = 3
    elif answer_length < 100:
        base_score = 6
    else:
        base_score = 8
    
    # Check for technical keywords
    technical_keywords = [
        'api', 'database', 'algorithm', 'data structure', 'programming',
        'software', 'system', 'architecture', 'framework', 'library',
        'function', 'class', 'object', 'method', 'variable'
    ]
    
    keyword_count = sum(1 for keyword in technical_keywords if keyword.lower() in answer.lower())
    keyword_bonus = min(2, keyword_count * 0.2)
    
    final_score = min(10, base_score + keyword_bonus)
    
    return {
        "overall_score": round(final_score, 1),
        "detailed_scores": {
            "technical_accuracy": round(final_score * 0.9, 1),
            "relevance_to_question": round(final_score * 1.1, 1),
            "depth_of_understanding": round(final_score * 0.8, 1),
            "resume_alignment": round(final_score * 0.7, 1),
            "communication_clarity": round(final_score * 1.0, 1),
            "problem_solving_approach": round(final_score * 0.9, 1)
        },
        "feedback": f"Mock evaluation: This is a simulated evaluation score of {final_score}/10 based on answer length ({answer_length} characters) and technical keywords found ({keyword_count} keywords). To get real AI-powered evaluation, please configure your GEMINI_API_KEY.",
        "strengths": f"Answer demonstrates understanding with {keyword_count} technical keywords identified.",
        "areas_for_improvement": "Configure GEMINI_API_KEY for detailed AI-powered feedback.",
        "resume_insights": "Mock evaluation - resume analysis not available without GEMINI_API_KEY",
        "is_mock": True,
        "mock_reason": "GEMINI_API_KEY not configured"
    }


# Test the mock function
if __name__ == "__main__":
    print("🧪 Testing Mock Evaluation Function")
    print("=" * 40)
    
    test_question = "What is the difference between REST and GraphQL?"
    test_answer = "REST uses HTTP methods and multiple endpoints, while GraphQL uses a single endpoint with flexible queries. GraphQL allows clients to request specific data, reducing over-fetching."
    test_resume = b"Mock resume content"
    
    result = mock_evaluate_candidate_answer(test_question, test_answer, test_resume)
    
    print(f"Question: {test_question}")
    print(f"Answer: {test_answer}")
    print(f"Score: {result['overall_score']}/10")
    print(f"Feedback: {result['feedback']}")
    print(f"Is Mock: {result['is_mock']}")
    print()
    print("✅ Mock evaluation system working!")
    print("📝 Configure GEMINI_API_KEY for real AI evaluation")