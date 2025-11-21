// Public-domain movie data
const movies = [
    {
        title: "Night of the Living Dead",
        poster: "https://image.tmdb.org/t/p/w500/4S0VQeGZo4PM3c1R6I0DcejS7eA.jpg",
        video: "https://archive.org/download/night_of_the_living_dead/night_of_the_living_dead_512kb.mp4",
        category: "horror"
    },
    {
        title: "His Girl Friday",
        poster: "https://image.tmdb.org/t/p/w500/3uPpXTbPtT0j6QP2nXG8PYN3npu.jpg",
        video: "https://archive.org/download/HisGirlFriday/HisGirlFriday_512kb.mp4",
        category: "drama"
    },
    {
        title: "Plan 9 From Outer Space",
        poster: "https://image.tmdb.org/t/p/w500/nF1e4bzo8nE5WkSxZBwbNG0Ax7E.jpg",
        video: "https://archive.org/download/Plan_9_From_Outer_Space/Plan_9_From_Outer_Space_512kb.mp4",
        category: "action"
    }
];

function generateSlider() {
    const slider = document.getElementById("slider");
    movies.forEach(m => {
        slider.innerHTML += `
            <div class="slide" style="background-image:url('${m.poster}')">
                <div class="slideTitle">${m.title}</div>
            </div>
        `;
    });
}

function generateMovies() {
    movies.forEach(m => {
        document.getElementById(m.category + "Movies").innerHTML += `
            <div class="movieCard">
                <img src="${m.poster}">
                <p class="movieTitle">${m.title}</p>
            </div>
        `;
        document.getElementById("trendingMovies").innerHTML += `
            <div class="movieCard">
                <img src="${m.poster}">
                <p class="movieTitle">${m.title}</p>
            </div>
        `;
    });
}

generateSlider();
generateMovies();
