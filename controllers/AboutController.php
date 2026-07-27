<?php
class AboutController extends Controller {
    public function __construct() {
        // Load any necessary models here
    }

    public function index() {
        // Load the view
        $this->view('about/index');
    }
}