CREATE DATABASE IF NOT EXISTS studystack;
USE studystack;

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    category_id INT NOT NULL,
    user_id INT,
    upvotes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT INTO categories (name) VALUES
    ('Web Dev'),
    ('Calculus'),
    ('UI/UX'),
    ('Data Science'),
    ('Algorithms');

INSERT INTO
  `studystack`.`resources` (`title`, `url`, `type`, `category_id`, `upvotes`)
VALUES
  (
    'MDN Web Docs',
    'https://developer.mozilla.org',
    'Article',
    1,
    12
  ),
  (
    'The Odin Project',
    'https://www.theodinproject.com',
    'Course',
    1,
    9
  ),
  (
    'Traversy Media - CSS Grid',
    'https://www.youtube.com/watch?v=jV8B24rSN5o',
    'Video',
    1,
    7
  ),
  (
    'Khan Academy Calculus',
    'https://www.khanacademy.org/math/calculus-1',
    'Course',
    2,
    15
  ),
  (
    '3Blue1Brown - Essence of Calculus',
    'https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr',
    'Video',
    2,
    20
  ),
  (
    'Laws of UX',
    'https://lawsofux.com',
    'Article',
    3,
    11
  ),
  (
    'Google UX Design Certificate',
    'https://www.coursera.org/professional-certificates/google-ux-design',
    'Course',
    3,
    8
  ),
  (
    'Kaggle Learn',
    'https://www.kaggle.com/learn',
    'Course',
    4,
    14
  ),
  (
    'Visualgo - Algorithm Visualizations',
    'https://visualgo.net',
    'Tool',
    5,
    10
  ),
  (
    'Introduction to Algorithms (CLRS)',
    'https://mitpress.mit.edu/9780262046305/',
    'Book',
    5,
    6
  );

CREATE TABLE IF NOT EXISTS resource_upvotes (
    user_id INT NOT NULL,
    resource_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, resource_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
);