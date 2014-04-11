module.exports = function (grunt) {

  grunt.loadNpmTasks('grunt-ts')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.initConfig({
    ts: {
      solr: {                                 // a particular target
        src: ["lib/Solr.ts"],        // The source typescript files, http://gruntjs.com/configuring-tasks#files
//        out: 'vineyard-solr.js',                // If specified, generate an out.js file which is the merged js file
        options: {                    // use to override the default options, http://gruntjs.com/configuring-tasks#options
          target: 'es5',            // 'es3' (default) | 'es5'
          module: 'commonjs',       // 'amd' (default) | 'commonjs'
          declaration: false,       // true | false  (default)
          verbose: true
        }
      }
    },
    watch: {
      lawn: {
        files: 'lib/**/*.ts',
        tasks: ['default']
      }
    }
  })

  grunt.registerTask('default', 'ts:solr');

}