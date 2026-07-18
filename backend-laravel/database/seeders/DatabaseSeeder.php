<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            SelfRegistrationSeeder::class,
            TrialClassesSeeder::class,
            EnrollmentSeeder::class,
            OperationalDemoSeeder::class,
        ]);
    }
}
