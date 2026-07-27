<?php
class TrainingController extends Controller {

    /**
     * Queries and lists only the active academic technical training courses
     */
    public function index(): void {
        // Instantiate the model to fetch data
        $courseModel = new CourseModel;
        
        // Fetch only active courses to hide drafts from public view
        $courses = $courseModel->getActiveCourses();

        // Pass data records to your training view index
        $this->view('training/index', [
            'title'   => 'Professional Engineering Academy - Athstack',
            'courses' => $courses
        ]);
    }
}