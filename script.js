// --- Trailer Popup Functionality ---

// Function to show the trailer popup modal
function showTrailerPopup() {
    const modal = document.getElementById('trailer-modal');
    const iframeWrapper = document.getElementById('trailer-iframe-wrapper');
    const iframe = iframeWrapper.querySelector('iframe');
    
    // Set a placeholder trailer URL. You must replace this with the 
    // actual trailer URL from your movieapi.giftedtech.co.ke response!
    iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1'; // Rickroll for now ;)

    modal.style.display = 'block';
    
    // Optional: Add a class to body to prevent background scrolling
    document.body.classList.add('modal-open'); 
}

// Function to hide the trailer popup modal
function hideTrailerPopup() {
    const modal = document.getElementById('trailer-modal');
    const iframeWrapper = document.getElementById('trailer-iframe-wrapper');
    const iframe = iframeWrapper.querySelector('iframe');
    
    // IMPORTANT: Clear the iframe's source to stop the video/audio playback
    iframe.src = ""; 

    modal.style.display = 'none';
    
    document.body.classList.remove('modal-open');
}

// Close modal if the user clicks anywhere outside of it
window.onclick = function(event) {
    const modal = document.getElementById('trailer-modal');
    if (event.target == modal) {
        hideTrailerPopup(); 
    }
}

// --- Placeholder for Glen AI Recommendations Logic ---
function getAIRecommendations(movieId) {
    // In a real application, this function would:
    // 1. Send an AJAX request to your backend server.
    // 2. The backend would analyze the user's viewing history or the current movieId.
    // 3. The backend would use an AI/ML model to select relevant movies.
    // 4. Return a list of suggested movies.
    console.log(`Getting AI recommendations for Movie ID: ${movieId}...`);
    // Example: Return mock data
    return [
        { id: 102, title: "The Martian", category: "Sci-Fi" },
        { id: 103, title: "Gravity", category: "Sci-Fi" },
        { id: 104, title: "Inception", category: "Thriller" },
    ];
}

// You would call this function when the player.html loads
// const recommendations = getAIRecommendations('current-movie-id-101');
// console.log("AI Suggestions:", recommendations);
