<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EnrollmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\WaitlistController;
use App\Http\Controllers\OrbundEnrollmentController;
use App\Http\Controllers\OrbundPaymentController;
use App\Http\Controllers\TrialConfigController;
use App\Http\Controllers\CustomWorkflowController;
use App\Http\Controllers\WorkflowEventController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\SchoolClassController;
use App\Http\Controllers\TrialConfigAdminController;
use App\Http\Controllers\PaymentWebhookController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\LeadProcessController;
use App\Http\Controllers\TrialConfirmationController;
use App\Http\Controllers\TwilioWebhookController;
use App\Http\Controllers\StaffInvitationController;
use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureAdmin;

// ─── Trial enrollment (public — called from Next.js frontend) ─────────────────
// Config: locations, age groups, semester ID for the trial booking form
Route::get('trial/config',  [TrialConfigController::class, 'config'])->name('trial.config');
Route::get('trial/classes', [TrialConfigController::class, 'classes'])->name('trial.classes');
Route::post('leads', [LeadController::class, 'store'])->middleware('throttle:30,1')->name('leads.store');
// Step 5: save enrollment after Orbund save-group-enrollment
Route::post('trial/enrollment', [OrbundEnrollmentController::class, 'store'])->name('trial.enrollment.store');
Route::get('trial/confirmation/{token}', [TrialConfirmationController::class, 'show'])->middleware('throttle:60,1');
Route::post('trial/confirmation/{token}', [TrialConfirmationController::class, 'update'])->middleware('throttle:20,1');
Route::post('webhooks/twilio/incoming', [TwilioWebhookController::class, 'incoming'])->middleware('throttle:120,1');
Route::get('staff-invitations/{token}', [StaffInvitationController::class, 'show'])->middleware('throttle:30,1');
Route::post('staff-invitations/{token}/accept', [StaffInvitationController::class, 'accept'])->middleware('throttle:10,1');
// Step 6: record payment after Orbund process-payment
Route::post('trial/payment', [OrbundPaymentController::class, 'store'])->name('trial.payment.store');

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
    Route::get('by-location/{location}', [CourseController::class, 'getCoursesByLocation'])->name('courses.by-location');
    Route::get('by-age-group/{ageGroup}', [CourseController::class, 'getCoursesByAgeGroup'])->name('courses.by-age-group');
    Route::get('{courseId}', [CourseController::class, 'showCourse'])->whereNumber('courseId')->name('courses.show');
    Route::get('{courseId}/classes', [CourseController::class, 'getAvailableClasses'])->whereNumber('courseId')->name('courses.classes');
});

// Catalog search: Location -> Age Group -> Course -> Curriculum -> Classes
Route::prefix('catalog')->group(function () {
    Route::get('classes', [CatalogController::class, 'search'])->name('catalog.search');
});

// Cart Endpoints (parent must be authenticated)
Route::prefix('cart')->middleware([AuthenticateApiToken::class])->group(function () {
    Route::get('/', [CartController::class, 'show'])->name('cart.show');
    Route::post('items', [CartController::class, 'addItem'])->name('cart.items.add');
    Route::delete('items/{id}', [CartController::class, 'removeItem'])->name('cart.items.remove');
});

// Checkout Endpoint (parent must be authenticated)
Route::middleware([AuthenticateApiToken::class])->group(function () {
    Route::post('checkout', [CheckoutController::class, 'checkout'])->name('checkout');
});

// Payment Endpoints
Route::post('payments/webhook/razorpay', [PaymentWebhookController::class, 'razorpay'])
    ->middleware('throttle:120,1')->name('payments.webhook.razorpay');
Route::prefix('payments')->middleware([AuthenticateApiToken::class])->group(function () {
    Route::post('create/{enrollmentId}', [PaymentController::class, 'createPayment'])->name('payments.create');
    Route::post('process', [PaymentController::class, 'processPayment'])->name('payments.process');
    Route::get('user/list', [PaymentController::class, 'listUserPayments'])->name('payments.list');
    Route::get('{paymentId}', [PaymentController::class, 'showPayment'])->whereNumber('paymentId')->name('payments.show');
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

// Parent enrollment endpoints (always scoped to the authenticated user)
Route::prefix('enrollments')->middleware([AuthenticateApiToken::class])->group(function () {
    Route::get('/', [EnrollmentController::class, 'index'])->name('enrollments.index');
    Route::get('/stats', [EnrollmentController::class, 'stats'])->name('enrollments.stats');
    Route::get('/filter-options', [EnrollmentController::class, 'filterOptions'])->name('enrollments.filter-options');
    Route::get('{enrollment}', [EnrollmentController::class, 'show'])->name('enrollments.show');
});

// Enrollment mutations are administrative operations.
Route::prefix('admin/enrollments')->middleware([AuthenticateApiToken::class, EnsureAdmin::class])->group(function () {
    Route::post('/', [EnrollmentController::class, 'store'])->middleware('permission:trial_enrollments')->name('admin.enrollments.store');
    Route::put('{enrollment}', [EnrollmentController::class, 'update'])->middleware('permission:trial_enrollments')->name('admin.enrollments.update');
    Route::delete('{enrollment}', [EnrollmentController::class, 'destroy'])->middleware('permission:trial_enrollments')->name('admin.enrollments.destroy');
});

// Admin-only endpoints
Route::prefix('admin')->middleware([AuthenticateApiToken::class, EnsureAdmin::class])->group(function () {
    Route::get('dashboard-counts', [AdminController::class, 'dashboardCounts'])->name('admin.dashboard-counts');
    Route::get('enrollments', [AdminController::class, 'enrollments'])->middleware('permission:trial_enrollments')->name('admin.enrollments');
    Route::get('enrollments/stats', [AdminController::class, 'stats'])->middleware('permission:trial_enrollments')->name('admin.enrollments.stats');
    Route::get('enrollments/filter-options', [AdminController::class, 'filterOptions'])->middleware('permission:trial_enrollments')->name('admin.enrollments.filter-options');
    Route::get('users', [AdminController::class, 'users'])->middleware('permission:users')->name('admin.users');
    Route::get('parents', [AdminController::class, 'parents'])->middleware('permission:parents')->name('admin.parents');
    Route::get('leads', [LeadController::class, 'index'])->middleware('permission:leads')->name('admin.leads');
    Route::patch('leads/{lead}/registration', [LeadController::class, 'updateRegistration'])->middleware('permission:leads')->name('admin.leads.registration');
    Route::post('leads/{lead}/calls', [LeadController::class, 'logCall'])->middleware('permission:leads')->name('admin.leads.calls');
    Route::patch('leads/{lead}/call-schedule', [LeadController::class, 'scheduleCall'])->middleware('permission:leads')->name('admin.leads.call-schedule');
    Route::post('leads/{lead}/actions', [LeadController::class, 'processAction'])->middleware('permission:leads')->name('admin.leads.actions');
    Route::post('leads/{lead}/book-trial', [LeadProcessController::class, 'bookTrial'])->middleware('permission:trial_enrollments');
    Route::post('leads/{lead}/decision', [LeadProcessController::class, 'decision'])->middleware('permission:trial_enrollments');
    Route::post('leads/{lead}/enroll', [LeadProcessController::class, 'enroll'])->middleware('permission:trial_enrollments');
    Route::patch('trial-students/{trialStudent}/reschedule', [LeadProcessController::class, 'reschedule'])->middleware('permission:trial_enrollments');
    Route::patch('enrollments/{enrollment}/assign-class', [LeadProcessController::class, 'assignClass'])->middleware('permission:classes');
    Route::post('enrollments/{enrollment}/complete-payment', [LeadProcessController::class, 'completePayment'])->middleware('permission:trial_enrollments');
    Route::post('enrollments/{enrollment}/orbund/retry', [LeadProcessController::class, 'retryOrbund'])->middleware('permission:trial_enrollments');
    Route::post('enrollments/{enrollment}/orbund/confirm', [LeadProcessController::class, 'confirmOrbund'])->middleware('permission:trial_enrollments');
    Route::get('lead-pipeline/report', [LeadProcessController::class, 'report'])->middleware('permission:leads');
    Route::get('trial-enrollments', [AdminController::class, 'trialEnrollments'])->middleware('permission:trial_enrollments')->name('admin.trial-enrollments');
    Route::get('notification-logs', [AdminController::class, 'notificationLogs'])->middleware('permission:notifications')->name('admin.notification-logs');
    Route::get('staff-invitations', [StaffInvitationController::class, 'index']);
    Route::post('staff-invitations', [StaffInvitationController::class, 'store']);
    Route::get('workflows',              [CustomWorkflowController::class, 'index'])->middleware('permission:workflows')->name('admin.workflows.index');
    Route::post('workflows',             [CustomWorkflowController::class, 'store'])->middleware('permission:workflows')->name('admin.workflows.store');
    Route::patch('workflows/{workflow}', [CustomWorkflowController::class, 'update'])->middleware('permission:workflows')->name('admin.workflows.update');
    Route::delete('workflows/{workflow}',[CustomWorkflowController::class, 'destroy'])->middleware('permission:workflows')->name('admin.workflows.destroy');
    Route::post('workflows/{workflow}/fire', [CustomWorkflowController::class, 'fire'])->middleware('permission:workflows')->name('admin.workflows.fire');
    Route::get('workflow-events',                        [WorkflowEventController::class, 'index'])->middleware('permission:workflows')->name('admin.workflow-events.index');
    Route::post('workflow-events',                       [WorkflowEventController::class, 'store'])->middleware('permission:workflows')->name('admin.workflow-events.store');
    Route::patch('workflow-events/{workflowEvent}',      [WorkflowEventController::class, 'update'])->middleware('permission:workflows')->name('admin.workflow-events.update');
    Route::delete('workflow-events/{workflowEvent}',     [WorkflowEventController::class, 'destroy'])->middleware('permission:workflows')->name('admin.workflow-events.destroy');
    // Attendance — mark attended / no-show and email no-shows
    Route::get('attendance',                         [AttendanceController::class, 'index'])->middleware('permission:attendance')->name('admin.attendance.index');
    Route::get('attendance/curricula',               [AttendanceController::class, 'curricula'])->middleware('permission:attendance')->name('admin.attendance.curricula');
    Route::patch('attendance/{id}',                  [AttendanceController::class, 'update'])->middleware('permission:attendance')->name('admin.attendance.update');
    Route::post('attendance/email-no-shows',         [AttendanceController::class, 'emailNoShows'])->middleware('permission:attendance')->name('admin.attendance.email-no-shows');

    Route::get('classes',           [SchoolClassController::class, 'index'])->middleware('permission:classes')->name('admin.classes.index');
    Route::post('classes',          [SchoolClassController::class, 'store'])->middleware('permission:classes')->name('admin.classes.store');
    Route::delete('classes/{schoolClass}', [SchoolClassController::class, 'destroy'])->middleware('permission:classes')->name('admin.classes.destroy');

    // Trial form config management (locations + age groups)
    Route::get('trial-config/locations',                    [TrialConfigAdminController::class, 'locationsIndex'])->middleware('permission:settings')->name('admin.trial-config.locations.index');
    Route::post('trial-config/locations',                   [TrialConfigAdminController::class, 'locationsStore'])->middleware('permission:settings')->name('admin.trial-config.locations.store');
    Route::delete('trial-config/locations/{department}',    [TrialConfigAdminController::class, 'locationsDestroy'])->middleware('permission:settings')->name('admin.trial-config.locations.destroy');
    Route::get('trial-config/age-groups',                   [TrialConfigAdminController::class, 'ageGroupsIndex'])->middleware('permission:settings')->name('admin.trial-config.age-groups.index');
    Route::post('trial-config/age-groups',                  [TrialConfigAdminController::class, 'ageGroupsStore'])->middleware('permission:settings')->name('admin.trial-config.age-groups.store');
    Route::delete('trial-config/age-groups/{trialAgeGroup}',[TrialConfigAdminController::class, 'ageGroupsDestroy'])->middleware('permission:settings')->name('admin.trial-config.age-groups.destroy');
});
