<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WaitlistController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\OrbundEnrollmentController;
use App\Http\Controllers\OrbundPaymentController;
use App\Http\Controllers\TrialConfigController;
use App\Http\Controllers\CustomWorkflowController;
use App\Http\Controllers\WorkflowEventController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\TrialConfigAdminController;
use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureAdmin;

// ─── Trial enrollment (public — called from Next.js frontend) ─────────────────
// Config: locations, age groups, semester ID for the trial booking form
Route::get('trial/config',  [TrialConfigController::class, 'config'])->name('trial.config');
Route::get('trial/classes', [TrialConfigController::class, 'classes'])->name('trial.classes');
// Step 1: capture trial registration lead before class selection
Route::post('leads', [LeadController::class, 'store'])->name('leads.store');
// Step 5: save enrollment after Orbund save-group-enrollment
Route::post('trial/enrollment', [OrbundEnrollmentController::class, 'store'])->name('trial.enrollment.store');
// Step 7: confirm enrollment status after thank-you page loads
Route::patch('trial/enrollment/{id}/confirm', [OrbundEnrollmentController::class, 'confirm'])->name('trial.enrollment.confirm');
// Step 6: record payment after Orbund process-payment
Route::post('trial/payment', [OrbundPaymentController::class, 'store'])->name('trial.payment.store');

// Lead management (admin only)
Route::middleware([AuthenticateApiToken::class, EnsureAdmin::class])->group(function () {
    Route::get('leads', [LeadController::class, 'index'])->name('leads.index');
    Route::patch('leads/{lead}', [LeadController::class, 'update'])->name('leads.update');
});

// ─── Auth endpoints ───────────────────────────────────────────────────────────
// Auth endpoints
Route::post('auth/login', [AuthController::class, 'login'])->name('auth.login');
Route::post('auth/register', [AuthController::class, 'register'])->name('auth.register');
Route::middleware([AuthenticateApiToken::class])->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');
    Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
    Route::put('auth/me', [AuthController::class, 'updateProfile'])->name('auth.me.update');
    Route::put('auth/change-password', [AuthController::class, 'changePassword'])->name('auth.change-password');
});

// Seamless Self-Registration Endpoints
Route::prefix('register')->group(function () {
    // Individual registration
    Route::post('individual', [RegistrationController::class, 'registerIndividual'])->name('register.individual');
    // Batch/Group registration
    Route::post('batch', [RegistrationController::class, 'registerBatch'])->name('register.batch');
});

// Course Discovery Endpoints
Route::prefix('courses')->group(function () {
    Route::get('filter-options', [CourseController::class, 'getFilterOptions'])->name('courses.filter-options');
    Route::get('programs', [CourseController::class, 'listPrograms'])->name('courses.programs');
    Route::get('departments', [CourseController::class, 'listDepartments'])->name('courses.departments');
    Route::get('/', [CourseController::class, 'listCourses'])->name('courses.list');
    Route::get('{courseId}', [CourseController::class, 'showCourse'])->name('courses.show');
    Route::get('{courseId}/classes', [CourseController::class, 'getAvailableClasses'])->name('courses.classes');
    Route::get('by-location/{location}', [CourseController::class, 'getCoursesByLocation'])->name('courses.by-location');
    Route::get('by-age-group/{ageGroup}', [CourseController::class, 'getCoursesByAgeGroup'])->name('courses.by-age-group');
});

// Payment Endpoints
Route::prefix('payments')->group(function () {
    Route::post('create/{enrollmentId}', [PaymentController::class, 'createPayment'])->name('payments.create');
    Route::post('process', [PaymentController::class, 'processPayment'])->name('payments.process');
    Route::get('{paymentId}', [PaymentController::class, 'showPayment'])->name('payments.show');
    Route::middleware([AuthenticateApiToken::class])->group(function () {
        Route::get('user/list', [PaymentController::class, 'listUserPayments'])->name('payments.list');
    });
});

// Waitlist Endpoints
Route::prefix('waitlist')->group(function () {
    Route::get('class/{classId}', [WaitlistController::class, 'getWaitlist'])->name('waitlist.class');
    Route::middleware([AuthenticateApiToken::class])->group(function () {
        Route::get('user', [WaitlistController::class, 'getUserWaitlist'])->name('waitlist.user');
        Route::delete('{waitlistId}', [WaitlistController::class, 'removeFromWaitlist'])->name('waitlist.remove');
    });
    Route::middleware([AuthenticateApiToken::class, EnsureAdmin::class])->group(function () {
        Route::post('{waitlistId}/approve', [WaitlistController::class, 'approveWaitlistEntry'])->name('waitlist.approve');
        Route::get('stats', [WaitlistController::class, 'getWaitlistStats'])->name('waitlist.stats');
    });
});

// Public enrollment endpoints
Route::prefix('enrollments')->group(function () {
    Route::get('/', [EnrollmentController::class, 'index'])->name('enrollments.index');
    Route::get('/stats', [EnrollmentController::class, 'stats'])->name('enrollments.stats');
    Route::get('/filter-options', [EnrollmentController::class, 'filterOptions'])->name('enrollments.filter-options');
    Route::post('/', [EnrollmentController::class, 'store'])->name('enrollments.store');
    Route::get('{enrollment}', [EnrollmentController::class, 'show'])->name('enrollments.show');
    Route::put('{enrollment}', [EnrollmentController::class, 'update'])->name('enrollments.update');
    Route::delete('{enrollment}', [EnrollmentController::class, 'destroy'])->name('enrollments.destroy');
});

// Admin-only endpoints
Route::prefix('admin')->middleware([AuthenticateApiToken::class, EnsureAdmin::class])->group(function () {
    Route::get('enrollments', [AdminController::class, 'enrollments'])->name('admin.enrollments');
    Route::get('enrollments/stats', [AdminController::class, 'stats'])->name('admin.enrollments.stats');
    Route::get('enrollments/filter-options', [AdminController::class, 'filterOptions'])->name('admin.enrollments.filter-options');
    Route::get('users', [AdminController::class, 'users'])->name('admin.users');
    Route::get('notification-logs', [AdminController::class, 'notificationLogs'])->name('admin.notification-logs');
    Route::get('workflows',              [CustomWorkflowController::class, 'index'])->name('admin.workflows.index');
    Route::post('workflows',             [CustomWorkflowController::class, 'store'])->name('admin.workflows.store');
    Route::patch('workflows/{workflow}', [CustomWorkflowController::class, 'update'])->name('admin.workflows.update');
    Route::delete('workflows/{workflow}',[CustomWorkflowController::class, 'destroy'])->name('admin.workflows.destroy');
    Route::post('workflows/{workflow}/fire', [CustomWorkflowController::class, 'fire'])->name('admin.workflows.fire');
    Route::get('workflow-events',                        [WorkflowEventController::class, 'index'])->name('admin.workflow-events.index');
    Route::post('workflow-events',                       [WorkflowEventController::class, 'store'])->name('admin.workflow-events.store');
    Route::patch('workflow-events/{workflowEvent}',      [WorkflowEventController::class, 'update'])->name('admin.workflow-events.update');
    Route::delete('workflow-events/{workflowEvent}',     [WorkflowEventController::class, 'destroy'])->name('admin.workflow-events.destroy');
    // Attendance — mark attended / no-show and email no-shows
    Route::get('attendance',                         [AttendanceController::class, 'index'])->name('admin.attendance.index');
    Route::get('attendance/curricula',               [AttendanceController::class, 'curricula'])->name('admin.attendance.curricula');
    Route::patch('attendance/{id}',                  [AttendanceController::class, 'update'])->name('admin.attendance.update');
    Route::post('attendance/email-no-shows',         [AttendanceController::class, 'emailNoShows'])->name('admin.attendance.email-no-shows');

    Route::get('classes',           [SchoolClassController::class, 'index'])->name('admin.classes.index');
    Route::post('classes',          [SchoolClassController::class, 'store'])->name('admin.classes.store');
    Route::delete('classes/{schoolClass}', [SchoolClassController::class, 'destroy'])->name('admin.classes.destroy');

    // Trial form config management (locations + age groups)
    Route::get('trial-config/locations',                    [TrialConfigAdminController::class, 'locationsIndex'])->name('admin.trial-config.locations.index');
    Route::post('trial-config/locations',                   [TrialConfigAdminController::class, 'locationsStore'])->name('admin.trial-config.locations.store');
    Route::delete('trial-config/locations/{department}',    [TrialConfigAdminController::class, 'locationsDestroy'])->name('admin.trial-config.locations.destroy');
    Route::get('trial-config/age-groups',                   [TrialConfigAdminController::class, 'ageGroupsIndex'])->name('admin.trial-config.age-groups.index');
    Route::post('trial-config/age-groups',                  [TrialConfigAdminController::class, 'ageGroupsStore'])->name('admin.trial-config.age-groups.store');
    Route::delete('trial-config/age-groups/{trialAgeGroup}',[TrialConfigAdminController::class, 'ageGroupsDestroy'])->name('admin.trial-config.age-groups.destroy');
});
